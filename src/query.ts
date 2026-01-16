import { PrismaClient, Tag } from "./client";
import { getNestedClause, vd } from "./helper";
import _ from "lodash";

import {
  CachedObject,
  CategoryCount,
  DataGrid,
  DataGridTransformation,
  DataPoint,
  DataPointModifier,
  Datasheet,
  DataTag,
  DataTagSelector,
  DumpedData,
  ICache,
  IdSelector,
  ITagsCache,
  ModelizeArguments,
  QueryOptions,
  QueryResult,
  QueryTransformationDump,
  QueryTransformationError,
  RawResult,
  ResultCell,
  Selector,
  Sheets,
} from "./types/types";

import Points from "./points";
import Modelizer from "./modelizer/modelizer";
import Convert from "./convert";
import Keys from "./keys";
import { DuckDBConnector } from "./external/DuckDB";
import TagsCache from "./helper/tagsCache";
import fs from "fs";
import path from "path";

type ParsedTag = Tag & {
  code: number;
  value: string;
};

export type RequestCategory = {
  key: string;
  id: number;
  tags: ParsedTag[];
  ids: (number | string)[];
};

export default class Query {
  prisma: PrismaClient | any;
  private duckDBConnector: DuckDBConnector;

  grid: DataGrid;
  options: QueryOptions;
  modelizer: Modelizer;

  private selector: Selector = [[]];
  private dataTagSelector: DataTagSelector = [[]];

  private nonGreedySelector: number[] = [];
  private maxSheets: number = 150;
  private cache: ICache;

  private selectionValidator: QueryOptions["selectionValidator"];
  private api: QueryOptions["api"];
  private modelizerCache: QueryOptions["modelizerCache"];

  tagsCache: ITagsCache;

  constructor(prisma: PrismaClient | any) {
    this.prisma = prisma;
    this.duckDBConnector = new DuckDBConnector();

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

    this.selectionValidator = options.selectionValidator;
    this.tagsCache = options.tagsCache;
    this.api = options.api;
    this.modelizerCache = options.modelizerCache;

    return this;
  }

  async compute(): Promise<QueryResult> {
    if (this.dataTagSelector) {
      this.selector = await this.convertDataTagSelector(this.dataTagSelector);
    }

    let tagIds: Selector;

    try {
      tagIds = this.parseSelector(this.selector);
    } catch (e) {
      throw "Parse Selector failed";
    }

    if (this.api && !this.tagsCache) {
      vd("setting up tags cache");
      const tagsCache = new TagsCache();
      await tagsCache.init(this.prisma, true);
      this.tagsCache = tagsCache;
    }

    const { points, sheets, tags, inputKeys } = await this.getRawResult(
      tagIds
    ).catch((e) => {
      throw e;
    });

    if (this.modelizerCache) {
      const cacheFile = path.join(
        this.modelizerCache.path,
        this.modelizerCache.key
      );
      if (fs.existsSync(cacheFile)) {
        const modelizer = new Modelizer({ strict: false }, this);
        modelizer.fromCache(cacheFile);

        return this.getModelizerResult(
          modelizer,
          [...sheets.slice(0,1)],
          tags,
          inputKeys,
          [],
          [],
          true
        );
      }
    }

    const modelizer = new Modelizer(
      {
        points,
        strict: false,
      },
      this
    );

    const errors: QueryTransformationError[] = [];
    const dumpedData: DumpedData[] = [];
    const dump: QueryTransformationDump = (data: any, section?: string) => {
      dumpedData.push({
        section,
        data,
      });
    };

    if (this.grid.transform) {
      await this.transformResult(
        this.grid.transform,
        modelizer,
        inputKeys,
        errors,
        dump
      ).catch((e) => {
        throw e;
      });
    }

    const result: QueryResult = this.getModelizerResult(
      modelizer,
      sheets,
      tags,
      inputKeys,
      errors,
      dumpedData,
      false
    );

    if (this.modelizerCache && !errors.length && sheets.length && modelizer.getCells().length) {
      modelizer.toCache(this.modelizerCache.path, this.modelizerCache.key);
    }

    return result;
  }

  getModelizerResult(
    modelizer: Modelizer,
    sheets: Datasheet[],
    tags: {
      name: string;
      id: number;
      params: string;
      categoryId: number;
    }[][],
    inputKeys: Keys,
    errors: QueryTransformationError[],
    dumpedData: DumpedData[],
    isCached: boolean
  ) {
    return {
      modelizer,
      sheets,
      tags,
      inputKeys: inputKeys.getInputKeys(),
      convert: (tmpModelizer?: Modelizer) =>
        new Convert(tmpModelizer || modelizer),
      isValid: () => !!modelizer.getFirstPoint(),
      isCached,
      visibleKeys: {
        row: modelizer.getLabels("row"),
        column: modelizer.getLabels("column"),
      },
      errors,
      dumpedData,
    };
  }

  async getRawResult(allTagIds: Selector): Promise<RawResult> {
    const modifiedDataPoints = <DataPoint[]>[];
    const usedTags: Tag[][] = [];
    const usedDatasheets = <Datasheet[]>[];
    const usedDatapoints = <DataPoint[]>[];

    const inputKeys = new Keys();

    for (const level in allTagIds) {
      const tagIds = allTagIds[level];
      const isNonGreedy = this.nonGreedySelector.includes(Number(level));

      let dataSheets = <Datasheet[]>[];
      let selectionTags = <Tag[]>[];

      if (this.cache?.exists(tagIds, isNonGreedy)) {
        const cachedObject = this.fromCache(
          this.cache.get(tagIds, isNonGreedy)
        );
        selectionTags = cachedObject.tags;
        this.validateSelection(selectionTags);

        dataSheets = cachedObject.sheets;
      } else {
        selectionTags = await this.getTagInfo(tagIds);
        this.validateSelection(selectionTags);

        if (this.api) {
          dataSheets = await this.findInDuckDB(selectionTags);
        } else {
          dataSheets = await this.findSheets(selectionTags, isNonGreedy);
        }

        this.cache?.set(
          tagIds,
          isNonGreedy,
          _.cloneDeep({
            sheets: dataSheets,
            tags: selectionTags,
          })
        );
      }

      const datapoints = this.extractDataPoints(dataSheets, Number(level));

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

  async getTagInfo(tagIds: IdSelector): Promise<Tag[]> {
    return this.prisma.tag.findMany({
      where: {
        id: {
          in: tagIds,
        },
      },
    });
  }

  validateSelection(tags: Tag[]) {
    if (typeof this.selectionValidator === "function") {
      const isValid = this.selectionValidator(tags);
      if (!isValid) {
        const tagInfo = tags.map(
          (tag) => `${tag.name} (@Cat ${tag.categoryId})`
        );
        throw "The selection is not valid: " + tagInfo.join("; ");
      }
    }
    return true;
  }

  async findInDuckDB(tags: Tag[]): Promise<Datasheet[]> {
    // Extract row_var, col_var, and file_path from tags
    if (!tags || tags.length === 0) {
      console.error("No tags provided for DuckDB query");
      return [];
    }

    const variables = tags.filter(
      (tag) => tag.categoryId === this.api.variableCategoryId
    );

    if (variables.length === 0) {
      console.error("No variable provided for DuckDB query");
      return [];
    }

    const splits = tags.filter(
      (tag) => tag.categoryId === this.api.splitCategoryId
    );

    const apiInfoTag = tags.find(
      (tag) => tag.categoryId === this.api.apiCategoryId
    );

    const requestCategories: RequestCategory[] = this.api.mapCategoryIds.map(
      (categoryMap) => {
        const parsedTags = this.parseCodeInfo(tags, categoryMap.id);
        return {
          ...categoryMap,
          tags: parsedTags,
          ids: parsedTags.map((parsedTag) => parsedTag.code),
        };
      }
    );

    const resultSheets = [];

    let apiUrl = "";
    if (apiInfoTag) {
      const params = JSON.parse(apiInfoTag.params);
      if (params.endpoint) {
        apiUrl = params.endpoint;
      }
    }

    const datasheets = await this.duckDBConnector.query(
      variables.map((variable) => variable.name),
      splits.map((split) => split.name),
      requestCategories,
      apiUrl
    );

    // vd("Got " + datasheets.length + " sheets");

    for (const datasheet of datasheets) {
      const targetTags = [];

      targetTags.push({
        ...apiInfoTag,
      });

      for (const tag of datasheet.tags) {
        if (tag.category === "split") {
          targetTags.push({
            categoryId: this.api.splitCategoryId,
            name: tag.value,
          });
          continue;
        }

        if (tag.category === "variable") {
          targetTags.push({
            categoryId: this.api.variableCategoryId,
            name: tag.value,
          });
          continue;
        }

        const targetCategory = this.api.mapCategoryIds.find(
          (mapCat) => mapCat.key === tag.category
        );

        if (targetCategory?.decode) {
          const tags = await this.tagsCache.getMany(targetCategory.id);
          let targetCode = tag.value;

          if (targetCategory.type !== "VARCHAR") {
            targetCode = parseInt(targetCode);
          }

          const sourceTag = tags.find(
            (sourceTag: any) => sourceTag.params?.code == targetCode
          );
          if (sourceTag) {
            targetTags.push({
              categoryId: targetCategory.id,
              name: sourceTag.name,
              id: sourceTag.id,
            });
          }
        } else if (targetCategory) {
          targetTags.push({
            categoryId: targetCategory.id,
            name: tag.value,
          });
        }
      }

      datasheet.tags = targetTags.map((targetTag) => {
        return {
          value: targetTag.name,
          categoryId: targetTag.categoryId,
        };
      });

      resultSheets.push(datasheet);
    }

    return resultSheets;
  }

  parseCodeInfo(tags: Tag[], categoryId: number): ParsedTag[] {
    return tags
      .filter((tag) => tag.categoryId === categoryId)
      .map((tag) => {
        return {
          ...tag,
          code: JSON.parse(tag.params)?.code,
          value: tag.name,
        };
      })
      .filter((tag) => typeof tag.code !== "undefined");
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
      console.error(
        "Exceeded maxSheets (" + this.maxSheets + "), got " + sheets.length
      );
      console.log(tags);
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
        importId: sheet.importId,
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

  extractDataPoints(sheets: Datasheet[], selection: number): DataPoint[] {
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
              value,
              selection
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

  parseSelector(selector: Selector): Selector {
    if (selector[0][0] === undefined) {
      throw "Selection is empty";
    }

    if (typeof selector[0][0] === "number") {
      return selector;
    }

    throw "Invalid selector.";
  }

  async convertDataTagSelector(selector: DataTagSelector): Promise<Selector> {
    const tagIdSelector = <Selector>[];
    for (const dataTag of selector) {
      const tagIds = await this.getTagIds(dataTag as DataTag[]);
      tagIdSelector.push(tagIds);
    }
    return tagIdSelector;
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
    modelizer: Modelizer,
    inputKeys: Keys,
    errors: QueryTransformationError[],
    dump: QueryTransformationDump
  ) {
    for (const transform of transformations) {
      if (transform.modelize && typeof transform.modelize === "function") {
        const apply = await this.checkCondition(transform, modelizer);
        if (apply) {
          const args = <ModelizeArguments>{
            query: this,
            inputKeys,
            params: transform.params,
            dump,
          };
          try {
            await transform.modelize(modelizer, args);
          } catch (e) {
            console.error(e);
            errors.push({
              errorMessage: e.message,
              lineNumber: e.lineNumber,
              name: transform.name,
              params: transform.params,
              executionOrder: transform.executionOrder,
              errorCode: transform.modelize.toString(),
            });
          }
        }
      }
    }
  }

  async checkCondition(transform, modelizer: Modelizer): Promise<boolean> {
    if (transform.condition && typeof transform.condition === "function") {
      if ((await transform.condition(modelizer)) !== true) {
        return false;
      }
    }
    if (!modelizer.getFirstPoint()) {
      return false;
    }
    return true;
  }
}
