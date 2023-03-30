import { PrismaClient, Tag } from "./client";
import { getNestedClause } from "./helper";
import _ from "lodash";

import {
  CachedObject,
  CategoryCount,
  CellKeys,
  DataGrid,
  DataGridTransformation,
  DataMergeResult,
  DataPoint,
  DataPointMeta,
  DataPointModifier,
  Datasheet,
  DataTag,
  IdSelector,
  NestedParentValue,
  QueryOptions,
  RawResultMeta,
  Result,
  ResultCell,
  ResultColumn,
  ResultRow,
  Selector,
  Sheets,
} from "./types/types";

import Points from "./points";
import ResultInfo from "./helper/resultInfo";
import Modelizer from "./modelizer";

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
  nonGreedySelector: number[] = [];
  options: QueryOptions;
  maxSheets: number = 150;

  constructor(prisma: PrismaClient | any) {
    this.prisma = prisma;
    this.sheets = [];
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

  static run(options: QueryOptions): Promise<Query> {
    const prisma = options.prisma || new PrismaClient();
    const query = new Query(prisma).setOptions(options);

    const selector = options.selector || [[]];

    return query.get(selector);
  }

  setOptions(options?: QueryOptions): this {
    if (options?.nonGreedySelector) {
      this.nonGreedySelector = options?.nonGreedySelector;
    }

    options.maxSheets = options.maxSheets ?? this.maxSheets;

    this.grid = options.grid || {
      modify: [],
      transform: [],
    };
    this.options = options;

    return this;
  }

  async get(selector: Selector): Promise<Query> {
    const tagIds = await this.parseSelector(selector).catch(() => {
      throw "Parse Selector failed";
    });
    await this.processTagIds(tagIds);

    this.setDataPointKeys(this.points, "keys");

    await this.merge().catch((e) => {
      throw e;
    });

    return this;
  }

  async processTagIds(allTagIds): Promise<void> {
    for (const level in allTagIds) {
      const tagIds = allTagIds[level];
      const isNonGreedy = this.nonGreedySelector.includes(Number(level));

      let datapoints = <DataPoint[]>[];
      if (this.options.cache?.exists(tagIds, isNonGreedy)) {
        datapoints = this.fromCache(
          this.options.cache.get(tagIds, isNonGreedy)
        );
      } else {
        const selectionTags = await this.getTagInfo(tagIds);
        this.tags.push(selectionTags);
        let sheets = await this.findSheets(selectionTags);

        if (sheets.length && isNonGreedy) {
          sheets = this.filterSheets(sheets);
        }

        datapoints = this.processSheets(sheets, Number(level));

        this.options.cache?.set(tagIds, isNonGreedy, {
          datapoints: _.cloneDeep(datapoints),
          sheets: _.cloneDeep(this.sheets),
          keys: _.cloneDeep(this.keys),
          inputKeys: _.cloneDeep(this.inputKeys),
          tags: _.cloneDeep(this.tags),
        });
      }

      const modifiedDataPoints = this.modifyDataPoints(
        datapoints,
        Number(level)
      );
      this.pushDataPoints(modifiedDataPoints);
    }
  }

  fromCache(cached: CachedObject): DataPoint[] {
    this.sheets = _.cloneDeep(cached.sheets);
    this.keys = _.cloneDeep(cached.keys);
    this.inputKeys = _.cloneDeep(cached.inputKeys);
    this.tags = _.cloneDeep(cached.tags);

    return _.cloneDeep(cached.datapoints);
  }

  toModelizer(result: Result): Modelizer {
    const modelizer = new Modelizer({}, this);
    modelizer.strict = false;
    result.body.forEach((row) => {
      row.cols.forEach((col) => {
        const newCell = modelizer.setCell(row.key, col.key);
        newCell.points = col.value;
        newCell.setValue(col.value[0].value);
      });
    });
    return modelizer;
  }

  fromModelizer(modelizer: Modelizer): DataMergeResult {
    const body = <DataMergeResult>{};
    modelizer.processRows((modelRow) => {
      const cols = {};
      modelRow.each((cell) => {
        cell.points = cell.points || [];
        const points = cell.points;
        if (points[0]) {
          points[0].value = cell.value;
        } else {
          points.push(
            Query.createDataPoint(modelRow.key, cell.colKey, cell.value)
          );
        }
        cols[cell.colKey] = points;
      });
      body[modelRow.key] = cols;
    });
    return body;
  }

  processSheets(sheets: Sheets, level: number) {
    const dataPoints = <DataPoint[]>[];
    if (sheets.length > 0) {
      this.parseSheets(sheets);
      this.setDataPoints(dataPoints);
      this.setDataPointKeys(dataPoints, "inputKeys");
    }
    return dataPoints;
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

  async findSheets(tags: Tag[]): Promise<Sheets> {
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

    return sheets;
  }

  parseSheets(sheets: Sheets) {
    this.sheets = sheets.map((sheet) => {
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

  setDataPoints(dataPoints: DataPoint[]): DataPoint[] {
    this.sheets.forEach((sheet) => {
      sheet.data.forEach((points, r) => {
        points.forEach((value: ResultCell, c: number) => {
          const dataPoint = <DataPoint>{
            tags: sheet.tags,
            row: sheet.rows[r],
            column: sheet.columns[c],
            value: value,
            meta: this.getDataPointMeta(sheet, r, c),
            setMeta: () => undefined,
            getMeta: () => undefined,
            getTag: () => undefined,
          };
          dataPoint.getMeta = Query.getMetaCb(dataPoint);
          dataPoint.setMeta = Query.setMetaCb(dataPoint);
          dataPoint.getTag = Query.getTagCb(dataPoint);

          dataPoints.push(dataPoint);
        });
      });
    });
    return dataPoints;
  }

  getDataPointMeta(sheet: Datasheet, r: number, c: number): DataPointMeta[] {
    const pointMeta = <DataPointMeta[]>[];

    sheet.meta.forEach((metaContent: any) => {
      if (metaContent?.key === "nested") {
        this.pushPointNestedMeta(metaContent, pointMeta, sheet, r, c);
      } else if (metaContent?.data) {
        if (this.metaHasRows(metaContent?.data)) {
          this.pushPointMeta(
            pointMeta,
            metaContent.key,
            metaContent.data[r][c]
          );
        } else {
          this.pushPointMeta(pointMeta, metaContent.key, metaContent.data[c]);
        }
      }

      if (metaContent?.info && metaContent.label === sheet.rows[r]) {
        this.pushPointInfo(metaContent, pointMeta, sheet, r, c);
      }
    });

    return pointMeta;
  }

  pushPointInfo(
    metaContent: RawResultMeta,
    pointMeta: DataPointMeta[],
    sheet: Datasheet,
    r: number,
    c: number
  ) {
    const hasMetaContent = metaContent.info?.find(
      (meta) => meta.value === sheet.columns[c]
    );
    if (hasMetaContent && hasMetaContent.info) {
      this.pushPointMeta(pointMeta, hasMetaContent.info, hasMetaContent.key);
    }
  }

  pushPointNestedMeta(
    metaContent: any,
    pointMeta: any,
    sheet: any,
    r: number,
    c: number
  ) {
    if (metaContent.label === sheet.rows[r]) {
      const parentValues = <NestedParentValue[]>[];
      metaContent.data.forEach((parentLabel: string) => {
        const parentRow = sheet.rows.indexOf(parentLabel);
        parentValues.push({
          label: parentLabel,
          value: sheet.data[parentRow][c],
        });
        if (parentLabel === metaContent.label) {
          this.pushPointMeta(pointMeta, "isParent", true);
        } else {
          this.pushPointMeta(pointMeta, "isChild", true);
        }
      });
      this.pushPointMeta(pointMeta, metaContent.key, parentValues);
    }
  }

  metaHasRows(metaData: any): boolean {
    return metaData[0] && Array.isArray(metaData[0]);
  }

  pushPointMeta(pointMeta: DataPointMeta[], key: string, value: any) {
    pointMeta.push({
      key: key,
      value: value,
    });
  }

  modifyDataPoints(dataPoints: DataPoint[], level: number): DataPoint[] {
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
    return dataPoints;
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

  pushDataPoints(dataPoints: DataPoint[]): void {
    this.points.push(...dataPoints);
  }

  setDataPointKeys(dataPoints: DataPoint[], mode: "keys" | "inputKeys") {
    dataPoints.forEach((point: DataPoint, c: number) => {
      this.addKey("row", point.row, mode);
      this.addKey("column", point.column, mode);
      this.addNestedKeys(point, mode);
      point.tags.forEach((tag: DataTag) => {
        if (tag.categoryId) {
          this.addKey(String(tag.categoryId), tag.value, mode);
        }
      });
    });
  }

  addNestedKeys(point: DataPoint, mode: "keys" | "inputKeys") {
    const hasNestedMeta = point?.meta?.find(
      (meta: any) => meta.key === "nested"
    );
    if (hasNestedMeta && Array.isArray(hasNestedMeta.value)) {
      hasNestedMeta?.value?.forEach((nested: NestedParentValue) => {
        this.addKey("nested", nested.label, mode);
      });
    }
  }

  addKey(category: string, value: string, mode: "keys" | "inputKeys") {
    if (!this[mode][category]) {
      this[mode][category] = {};
    }

    this[mode][category][value] = true;
  }

  async merge() {
    let result = <DataMergeResult>{};

    this.points.forEach((point) => {
      const rowKey = point.row;
      const columnKey = point.column;

      result[rowKey] = result[rowKey] || {};
      result[rowKey][columnKey] = result[rowKey][columnKey] || [];
      result[rowKey][columnKey].push(point);
    });

    this.setResult(result);

    if (this.grid.transform) {
      await this.transformResult(this.grid.transform);
    }

    return this;
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

  async parseLiteralSelector(selector): Promise<Selector> {
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

  setResult(result: DataMergeResult): void {
    this.visibleKeys.row = [];
    this.visibleKeys.column = [];
    this.result.body = [];

    for (const r in result) {
      const cols = <ResultColumn[]>[];
      this.visibleKeys.row.push(r);

      const row = result[r];
      for (const c in row) {
        this.visibleKeys.column.push(c);

        cols.push({
          key: c,
          value: row[c],
          getPoint: Query.getPointCb(row[c]),
        });
      }

      this.result.body.push({
        key: r,
        cols: cols,
        getColumn: Query.getColumnCb(cols),
      });
    }

    this.result.isValid = (): boolean => {
      if (this.result.body && this.result.body[0] && this.result.body[0].cols) {
        return true;
      }
      return false;
    };
    this.result.info = new ResultInfo(this.result);
    this.visibleKeys.column = [...new Set(this.visibleKeys.column)];
  }

  static createDataPoint(
    rowKey?: string,
    colKey?: string,
    value?: ResultCell
  ): DataPoint {
    const point = <DataPoint>{
      tags: [],
      meta: [],
      row: rowKey || "n/a createDataPoint",
      column: colKey || "n/a createDataPoint",
      value: value || null,
      getMeta: () => undefined,
      setMeta: () => undefined,
      getTag: () => undefined,
    };

    point.getMeta = Query.getMetaCb(point);
    point.setMeta = Query.setMetaCb(point);
    point.getTag = Query.getTagCb(point);

    return point;
  }

  static getPointCb(points: DataPoint[]) {
    return (index?: number): DataPoint => {
      const point = points[index || 0];
      return point;
    };
  }

  static getColumnCb(cols: ResultColumn[]) {
    return (colId?: number): ResultColumn => {
      return cols[colId || 0];
    };
  }

  static getMetaCb(point: DataPoint) {
    return (key: string): DataPointMeta | undefined => {
      if (point.meta) {
        return point.meta.find((meta) => meta.key === key);
      }
    };
  }

  static setMetaCb(point: DataPoint) {
    return (key: string, value: any): DataPoint => {
      point.meta.push({
        key: key,
        value: value,
      });
      return point;
    };
  }

  static getTagCb(point: DataPoint) {
    return (categoryId: number): DataTag | undefined => {
      if (point.tags) {
        return (
          point.tags.find((meta) => meta.categoryId === categoryId) || {
            value: undefined,
            category: undefined,
            categoryId: categoryId,
            id: undefined,
          }
        );
      }
    };
  }

  async transformResult(transformations: DataGridTransformation[]) {
    if (!this.result.isValid()) {
      return;
    }
    try {
      const modelizer = this.toModelizer(this.result);
      await this.applyTransformations(transformations, modelizer);
      this.setResult(this.fromModelizer(modelizer));
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
