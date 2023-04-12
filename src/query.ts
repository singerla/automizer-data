import { PrismaClient, Tag } from "./client";
import { getNestedClause } from "./helper";
import _ from "lodash";

import {
  CachedObject,
  CategoryCount,
  CellKeys,
  DataGrid,
  DataGridTransformation,
  DataPoint,
  DataPointModifier,
  Datasheet,
  DataTag,
  DataTagSelector,
  ICache,
  IdSelector,
  QueryOptions,
  QueryResult,
  RawResult,
  Result,
  ResultCell,
  ResultRow,
  Selector,
  Sheets,
} from "./types/types";

import Points from "./points";
import Modelizer from "./modelizer";
import Convert from "./convert";
import Keys from "./keys";

export default class Query {
  prisma: PrismaClient | any;
  clause: any;
  sheets: Datasheet[];
  allSheets: Datasheet[];
  inputKeys: CellKeys;
  keys: CellKeys;
  visibleKeys: {
    row: string[];
    column: string[];
  };
  points: DataPoint[];
  grid: DataGrid;
  result: Result;
  tags: Tag[][] = [];
  options: QueryOptions;

  modelizer: Modelizer;

  private selector: Selector = [[]];
  private dataTagSelector: DataTagSelector = [[]];

  private nonGreedySelector: number[] = [];
  private maxSheets: number = 150;
  private cache: ICache;

  constructor(prisma: PrismaClient | any) {
    this.prisma = prisma;
    this.inputKeys = <CellKeys>{};
    this.keys = <CellKeys>{};
    this.visibleKeys = {
      row: [],
      column: [],
    };
    this.result = <Result>{
      body: <ResultRow[]>[],
      modelizer: undefined,
    };
    this.points = <DataPoint[]>[];
    this.grid = <DataGrid>{};
    this.allSheets = <Datasheet[]>[];

    return this;
  }

  static run(options: QueryOptions): Promise<QueryResult> {
    const prisma = options.prisma || new PrismaClient();
    const query = new Query(prisma).setOptions(options);

    return query.compute();
  }

  setOptions(options: QueryOptions): this {
    this.maxSheets = options.maxSheets ?? this.maxSheets;
    this.grid = options.grid || {
      modify: [],
      transform: [],
      options: {},
    };
    this.nonGreedySelector =
      options.nonGreedySelector || this.nonGreedySelector;
    this.cache = options.cache;

    this.dataTagSelector = options.dataTagSelector;
    this.selector = options.selector || this.selector;

    return this;
  }

  async compute(): Promise<QueryResult> {
    if (this.dataTagSelector) {
      this.selector = await this.convertDataTagSelector(this.dataTagSelector);
    }

    const selector = this.selector;
    const tagIds = await this.parseSelector(selector).catch(() => {
      throw "Parse Selector failed";
    });

    const { points, sheets, tags, inputKeys } = await this.getRawResult(tagIds);

    const modelizer = new Modelizer(
      {
        points,
        strict: false,
      },
      this
    );

    if (this.grid.transform) {
      await this.transformResult(this.grid.transform, modelizer);
    }

    return {
      modelizer,
      sheets,
      tags,
      inputKeys: inputKeys.getInputKeys(),
      convert: () => new Convert(modelizer),
      isValid: () => !!modelizer.getFirstPoint(),
      visibleKeys: {
        row: modelizer.getKeys("row"),
        column: modelizer.getKeys("col"),
      },
    };
  }

  async getRawResult(allTagIds): Promise<RawResult> {
    const modifiedDataPoints = <DataPoint[]>[];
    const usedTags: Tag[][] = [];
    const usedDatasheets = <Datasheet[]>[];
    const usedDatapoints = <DataPoint[]>[];

    const inputKeys = new Keys();

    for (const level in allTagIds) {
      const tagIds = allTagIds[level];
      const isNonGreedy = this.nonGreedySelector.includes(Number(level));

      let datapoints = <DataPoint[]>[];
      let dataSheets = <Datasheet[]>[];
      let selectionTags = <Tag[]>[];

      if (this.cache?.exists(tagIds, isNonGreedy)) {
        const cachedObject = this.fromCache(
          this.cache.get(tagIds, isNonGreedy)
        );
        selectionTags = cachedObject.tags;
        dataSheets = cachedObject.sheets;
        datapoints = cachedObject.datapoints;
      } else {
        selectionTags = await this.getTagInfo(tagIds);
        dataSheets = await this.findSheets(selectionTags, isNonGreedy);
        datapoints = this.extractDataPoints(dataSheets);

        this.cache?.set(
          tagIds,
          isNonGreedy,
          _.cloneDeep({
            datapoints: datapoints,
            sheets: dataSheets,
            tags: selectionTags,
          })
        );
      }

      inputKeys.addPoints(datapoints);

      usedDatapoints.push(...datapoints);
      usedTags.push(selectionTags);
      usedDatasheets.push(...dataSheets);

      const pointsCls = this.modifyDataPoints(datapoints, Number(level));

      modifiedDataPoints.push(...pointsCls.points);
    }

    return {
      inputKeys,
      points: modifiedDataPoints,
      tags: usedTags,
      sheets: usedDatasheets,
    };
  }

  fromCache(cached: CachedObject): CachedObject {
    return _.cloneDeep(cached);
  }

  async getTagInfo(tagIds: number[]): Promise<Tag[]> {
    return this.prisma.tag.findMany({
      where: {
        id: {
          in: tagIds,
        },
      },
    });
  }

  async findSheets(tags: Tag[], isNonGreedy: boolean): Promise<Datasheet[]> {
    let clause = getNestedClause(tags);
    if (!clause) return [];

    let sheets = await this.prisma.sheet.findMany({
      where: clause,
      include: {
        tags: true,
      },
      skip: 0,
      take: this.maxSheets,
    });

    if (sheets.length === this.maxSheets) {
      // throw "Too many sheets. Add more tags to selection.";
      return [];
    }

    if (sheets.length && isNonGreedy) {
      sheets = this.filterSheets(sheets);
    }

    return this.parseSheets(sheets);
  }

  parseSheets(sheets: Sheets): Datasheet[] {
    const dataSheets = sheets.map((sheet) => {
      return <Datasheet>{
        id: sheet.id,
        tags: sheet.tags.map((tag) => {
          return {
            id: tag.id,
            value: tag.name,
            categoryId: tag.categoryId,
          };
        }),
        rows: JSON.parse(sheet.rows),
        columns: JSON.parse(sheet.columns),
        data: JSON.parse(sheet.data),
        meta: JSON.parse(sheet.meta),
      };
    });
    return dataSheets;
  }

  /*
   * Filters sheets with the least tag count by categoryId.
   * This will prevent mixing sheets with different set of tags.
   */
  filterSheets(sheets: Sheets): Sheets {
    const nonGreedyIds = this.getSheetCategoryCount(sheets).map(
      (count) => count.sheetId
    );
    return sheets.filter((sheet) => nonGreedyIds.includes(sheet.id));
  }

  getSheetCategoryCount(sheets: Sheets): CategoryCount[] {
    const categoryCount = <CategoryCount[]>[];
    sheets.forEach((sheet) => {
      categoryCount.push({
        sheetId: sheet.id,
        categoryIds: sheet.tags.map((tag) => tag.categoryId),
      });
    });

    categoryCount.sort((a, b) => a.categoryIds.length - b.categoryIds.length);
    const smallestCount = categoryCount[0].categoryIds.length;

    return categoryCount.filter(
      (categoryCount) => categoryCount.categoryIds.length <= smallestCount
    );
  }

  extractDataPoints(sheets: Datasheet[]): DataPoint[] {
    const dataPoints = <DataPoint[]>[];
    sheets.forEach((sheet) => {
      sheet.data.forEach((points, r) => {
        points.forEach((value: ResultCell, c: number) => {
          dataPoints.push(
            Points.dataPointFactory(
              sheet.rows[r],
              sheet.columns[c],
              sheet.tags,
              Points.getDataPointMeta(sheet, r, c),
              value
            )
          );
        });
      });
    });
    return dataPoints;
  }

  modifyDataPoints(dataPoints: DataPoint[], level: number): Points {
    const modifiers = this.getDatapointModifiersByLevel(level);
    const points = new Points(dataPoints);
    modifiers.forEach((modifier) => {
      if (modifier.cb) {
        modifier.cb(points);
      }

      if (modifier.callbacks) {
        modifier.callbacks.forEach((callback) => {
          if (typeof callback === "function") {
            callback(points);
          }
        });
      }
    });

    return points;
  }

  getDatapointModifiersByLevel(level: number): DataPointModifier[] {
    const modifiers = <DataPointModifier[]>[];
    this.grid?.modify?.forEach((modifier) => {
      if (modifier.applyToLevel && modifier.applyToLevel.indexOf(level) > -1) {
        modifiers.push(modifier);
      } else if (!modifier.applyToLevel || modifier.applyToLevel.length === 0) {
        modifiers.push(modifier);
      }
    });
    return modifiers;
  }

  async parseSelector(selector: Selector): Promise<IdSelector[]> {
    if (selector[0][0] === undefined) {
      throw "Selection is empty";
    }

    if (typeof selector[0][0] === "number") {
      return selector as IdSelector[];
    }

    throw "Invalid selector.";
  }

  async convertDataTagSelector(selector: DataTagSelector): Promise<Selector> {
    const tagIdSelector = <number[][]>[];
    for (const dataTag of selector) {
      const tagIds = await this.getTagIds(dataTag as DataTag[]);
      tagIdSelector.push(tagIds);
    }
    return tagIdSelector as IdSelector[];
  }

  async getTagIds(tags: DataTag[]): Promise<number[]> {
    tags = await this.getTags(tags);

    return tags.map((tag) => tag.id);
  }

  async getTags(tags: DataTag[]): Promise<DataTag[]> {
    for (let i in tags) {
      let tag = tags[i];
      await this.setCategoryId(tag);
      await this.setTagId(tag);
    }

    return tags;
  }

  async setCategoryId(tag: DataTag): Promise<void> {
    if (tag.categoryId) return;

    const categoryItem = await this.prisma.category.findFirst({
      where: {
        name: tag.category,
      },
    });

    if (!categoryItem) {
      throw new Error(`Category not found: ${tag.category}`);
    }

    tag.categoryId = categoryItem.id;
  }

  async setTagId(tag: DataTag): Promise<void> {
    if (tag.id) return;

    const tagItem = await this.prisma.tag.findFirst({
      where: {
        categoryId: tag.categoryId,
        name: tag.value,
      },
    });

    if (!tagItem) {
      throw new Error(
        `Tag not found: ${tag.value} @ category: ${tag.category}`
      );
    }

    tag.id = tagItem.id;
  }

  async transformResult(
    transformations: DataGridTransformation[],
    modelizer: Modelizer
  ) {
    try {
      await this.applyTransformations(transformations, modelizer);
    } catch (e) {
      throw e;
    }
  }

  async applyTransformations(
    transformations: DataGridTransformation[],
    modelizer: Modelizer
  ) {
    for (const transform of transformations) {
      if (transform.modelize && typeof transform.modelize === "function") {
        const apply = await this.checkCondition(transform, modelizer);
        if (apply) {
          await transform.modelize(modelizer, this);
        }
      }
    }
  }

  async checkCondition(transform, modelizer): Promise<boolean> {
    if (transform.condition && typeof transform.condition === "function") {
      if ((await transform.condition(modelizer)) !== true) {
        return false;
      }
    }
    return true;
  }
}
