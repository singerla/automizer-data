import { PrismaClient, Sheet, Tag } from '../client';
import { Gesstabs } from '../parser/gesstabs';
import { Generic } from '../index';
import { Parser } from '../parser/parser';
import ResultClass from '../convert';
import Convert from '../convert';
import { ChartValueStyle, TableRowStyle } from 'pptx-automizer';
import ResultInfo from '../helper/resultInfo';
import Modelizer from '../modelizer/modelizer';
import Query from '../query';
import { InputKeys } from '../modelizer/modelizer-types';
import Keys from '../keys';
import mysql from 'mysql2/promise';

export type PrismaId = number;

export type StoreOptions = {
  replaceExisting?: boolean;
  dropAllSheets?: boolean;
  dropAllTags?: boolean;
  filename?: string;
  dedupTagCategories?: boolean;
  noDedupTagCategories?: PrismaId[];
  userId?: PrismaId;
  statusTracker?: StatusTracker['next'];
  tagsCache?: ITagsCache;
};

export type ParserType = Parser | Generic | Gesstabs;

export type ParserOptions = {
  separator?: string;
  firstCell?: string;
  renderTags: (info: RawResultInfo[], pushCb: Tagger) => void;
  renderHeader?: (
    cells: string[],
    meta: RawResultMeta[],
    parser: ParserType,
    slice: RawColumnSlice,
  ) => string[];
  renderHeaderTags?: (
    label?: string[],
    table?: RawTable,
    parser?: ParserType,
  ) => DataTag[];
  renderRow: (
    cells: ResultCell[],
    label: string,
    meta: RawResultMeta[],
    parser: ParserType,
  ) => ResultCell[];
  renderLabel?: (label: string) => string;
  renderRawResultData?: (data: RawResultData, parser: ParserType) => void;
  renderRawTables?: (
    rawTables: RawTable[],
    tags: DataTag[],
    parser: ParserType,
  ) => void;
  metaMap: MetaMap;
  significance?: ParserOptionsSignificance;
  overcodes?: Overcodes[];
  skipRows: string[];
  worksheetId?: number;
  tmpDir?: string;
  pspp?: ParserOptionsPspp;
  mysql?: ParserOptionsMySQL;
  customXlsx?: ParserOptionsCustomXlsx;
  metaKey?: string;
  totalLabel?: string;
  mapCategories: Record<string, string>,
  tagsMarker?: string;
};

export type ParserOptionsMySQL = {
  connection: mysql.ConnectionOptions;
  callback: (
    connection: mysql.Connection,
    datasheets: Datasheet[],
  ) => Promise<void>;
};

export type ParserOptionsCustomXlsx = (
  rows: any[],
  file: string,
) => RawResultData[];

export type ParserOptionsPspp = {
  binary: string;
  psppLanguage?: 'en' | 'de';
  keys?: ParserOptionsPsppKeys;
  filters: ParserOptionsPsppFilters[];
  labels: ParserOptionsPsppLabels[];
  commands: ParserOptionsPsppCommands[];
  addTags: DataTag[];
};

export type ParserOptionsPsppKeys = {
  skipKeys: string[];
  valueKey: string;
  tableKey: string;
  totalKey: string;
  totalLabel: string;
};

export type ParserOptionsPsppLabels = {
  section: 'rows' | 'columns' | string;
  replace: string;
  by: string;
};

export type ParserOptionsPsppFilters = {
  category: string;
  value: string;
  key: string;
  selectIf: string;
};

export type ParserOptionsPsppCommands = {
  name?: 'CROSSTABS';
  filters?: string[];
  rowVar: string;
  columnVars: string[];
};

export type ParserOptionsSignificance = {
  cellSeparator: string;
  headerSeparator: string;
  headerFilter: string[];
  lettersKey: string;
  valueKey: string;
};

export type ResultCell = number | string | null;

export type StoreSummary = {
  ids: PrismaId[];
  deleted: PrismaId[];
};

export type StatusTracker = {
  current: number;
  max: number;
  share: number;
  info: string | undefined;
  next: (tracker: StatusTracker) => void;
  increment: () => void;
};

export type RawResult = {
  points: DataPoint[];
  tags: Tag[][];
  sheets: Datasheet[];
  inputKeys: Keys;
};

export type CachedObject = {
  key?: string;
  sheets: Datasheet[];
  tags: Tag[];
  // datapoints: DataPoint[];
  // keys: CellKeys;
  // inputKeys: CellKeys;
};

export interface ICache {
  exists: (selector: Selector, isNonGreedy: boolean) => boolean;
  get: (selector: Selector, isNonGreedy: boolean) => CachedObject;
  set: (selector: Selector, isNonGreedy: boolean, data: CachedObject) => void;
}

export interface ITagsCache {
  init: (prisma: PrismaClient) => Promise<void>;
  setPrismaClient: (prisma: PrismaClient) => void;
  exists: (name: string, categoryId: number) => boolean;
  tagExists: (tag: Tag) => boolean;
  getMany: (categoryId?: number) => Promise<Tag[]>;
  get: (name: string, categoryId: number) => Tag | null;
  getByValue: (name: string) => Tag[];
  getById: (id: number) => Tag | null;
  create: (name?: string, categoryId?: number) => Promise<Tag>;
  set: (tag: Tag) => void;
  reset: () => Promise<void>;
}

export type QueryOptions = {
  selector?: Selector;
  dataTagSelector?: DataTagSelector;
  nonGreedySelector?: number[];
  grid?: DataGrid;
  prisma?: PrismaClient;
  maxSheets?: number;
  cache?: ICache;
  tagsCache?: ITagsCache;
};

export type CategoryCount = {
  sheetId: PrismaId;
  categoryIds: PrismaId[];
};

export type IdSelector = PrismaId[];
export type Selector = IdSelector[];
export type DataTagSelector = DataTag[][];

export type NestedClause = {
  tags: {
    some: {
      id:
        | PrismaId
        | {
        in: PrismaId[];
        AND?: NestedClause;
      };
    };
  };
};
export type NestedClauseTagGroup = Record<PrismaId, PrismaId[]>;

export type DataTag = {
  id?: PrismaId;
  category: string;
  value: string;
  categoryId?: PrismaId;
};

export type DataPoint = {
  row: string;
  column: string;
  value: ResultCell;
  tags: DataTag[];
  meta?: DataPointMeta[];
  selection?: number;
  mode?: string;
  style?: TableRowStyle | ChartValueStyle;
  getMeta: (key: string) => DataPointMeta | undefined;
  getMetas: () => DataPointMeta[];
  setMeta: (key: string, value: any) => DataPoint;
  getTag: (categoryId: number) => DataTag | undefined;
};

export type DataPointMeta = {
  key: string;
  value: ResultCell | NestedParentValue[];
};

export type Datasheet = {
  id?: number;
  tags: DataTag[];
  columns: string[];
  rows: string[];
  data: ResultCell[][];
  meta: RawResultMeta[];
};

export type Sheets = (Sheet & {
  tags: Tag[];
})[];

export type QueryResult = {
  modelizer: Modelizer;
  sheets: Datasheet[];
  tags: Tag[][];
  inputKeys: InputKeys;
  convert: (modelizer?: Modelizer) => Convert;
  isValid: () => boolean;
  visibleKeys: {
    row: string[];
    column: string[];
  };
  info?: Record<string, any>;
  errors?: QueryTransformationError[];
  dumpedData?: DumpedData[];
};

export type QueryTransformationError = {
  name: string;
  params: Record<string, any>;
  executionOrder: number;
  errorCode: string;
  errorMessage: string;
  lineNumber: number;
};

export type DumpedData = {
  section?: string;
  data: any;
};
export type QueryTransformationDump = (data: any, section?: string) => void;

export type QueryResultKeys = {
  row: string[];
  column: string[];
  category: QueryResultCategoryKeys[];
};

export type QueryResultCategoryKeys = {
  categoryId: number;
  keys: string[];
};

export type DataPointFilterResult = {
  points: DataPoint[];
  label: string;
};

export type DataPointFilter = {
  (points: DataPoint[]): DataPointFilterResult;
};

export type DataGridFunction = {
  (tag: DataTag | string, key?: string | string[]): DataPointFilter;
};

export type DataGridCategories = {
  (keys: CellKeys): DataPointFilter[];
};

export type DataGrid = {
  modify?: DataPointModifier[];
  transform?: DataGridTransformation[];
  options?: Record<string, any>;
};

export type ResultCellInfo = {
  value: ResultCell;
  tags: Tag[];
};

export type DataMergeResult = {
  [rowKey: string]: {
    [colKey: string]: DataPoint[];
  };
};

export type DataResultCellFilter = {
  (points: DataPoint[]): DataPoint[];
};

export type DataPointModifier = SortableModification & {
  cb?: any;
  callbacks?: any[];
};

export type ModelizeArguments = {
  query?: Query;
  inputKeys?: Keys;
  params: Record<string, any>;
};

export type DataGridTransformation = SortableModification & {
  modelize?: (mod: Modelizer, args: ModelizeArguments) => void | Promise<void>;
  condition?: (args: any) => Promise<boolean>;
  params?: Record<string, any>;
};

export type SortableModification = {
  executionOrder?: number;
  applyToLevel?: number[];
  name?: string;
  key?: string;
  condition?: string;
  conditionParams?: ConditionArgsHasParams;
  conditions?: ConditionArgsHasParams[];
};

export type ConditionArgsHasParams = {
  conditionName?: string;
  name?: string;
  categoryId?: number;
  loopId?: number;
  hasOneOf?: string[];
  hasTagId?: number[];
  hasSelection?: number[];
  hasItem?: string[];
  hasRound?: number[];
  targetValue?: string | number | boolean;
  hasValue?: string | number | boolean;
  revert?: boolean;
  updateParams?: any;
};

export type CellKey = {
  [key: string]: boolean;
};

export type CellKeys = {
  [key: string]: CellKey;
};

export type ResultColumn = {
  key: string;
  value: DataPoint[];
  style?: TableRowStyle | ChartValueStyle;
  getPoint?: (index?: number) => DataPoint;
};

export type ResultRow = {
  key: string;
  cols: ResultColumn[];
  getColumn?: (colId: number) => ResultColumn;
};

export type Result = {
  isValid: () => boolean;
  body: ResultRow[];
  modelizer: Modelizer;
  info: ResultInfo;
};

export type Tagger = {
  tags: DataTag[];
  push: (cat: string, val: string) => void;
};

export type MetaMap = {
  [key: string]: string[];
};

export type MetaParam = {
  cb: (
    row: ResultRow,
    params: MetaParam,
    result: ResultClass,
  ) => TableRowStyle[] | ChartValueStyle[];
  styles: MetaParamStyle[];
};

export type MetaParamStyle = {
  key?: string;
  value?: string;
  keys?: string[];
  style: TableRowStyle | ChartValueStyle;
};

export type Overcodes = {
  prefix?: string;
  match?: string;
  key: string;
  callback?: (label: string) => boolean;
};

export type RawRow = ResultCell[];

export type RawResultMeta = {
  key: string;
  label: string;
  data?: RawRow | RawRow[];
  info?: RawResultInfo[];
};

export type RawResultInfo = {
  key: string;
  value: string;
  info?: string;
};

export type RawResultNestedParent = {
  level: number;
  key: string;
  label: string;
};

export type NestedParentValue = {
  label: string;
  value: ResultCell;
};

export type RawResultNestedItem = {
  label: string;
  parents: RawResultNestedParent[];
};

export type RawResultData = {
  info: RawResultInfo[];
  header: RawRow[];
  body: RawRow[];
  meta: RawResultMeta[];
  nested?: RawResultNestedItem[];
  duplicates?: Record<string, number>;
};

export type RawColumnSlice = {
  label: string;
  start: number;
  end: number;
  length: number;
};

export type RawTable = {
  label: string;
  rows: string[];
  columns: string[];
  data: ResultCell[][];
  meta: RawResultMeta[];
};

export type DataPointTarget = 'row' | 'column';

export type RenameLabel = {
  target?: DataPointTarget;
  targets?: DataPointTarget[];
  replace: string;
  by: string;
  cb?: (label: string) => string;
  isPattern: boolean;
  ucFirst?: boolean;
};

export type ModifierCommandArgument =
  | ModArgsCustom
  | ModArgsFilter
  | ModArgsFilterNested
  | ModArgsExclude
  | ModArgsStringTolabel
  | ModArgsTagTolabel
  | ModArgsAddToOthers
  | ModArgsAddMeta
  | ModArgsAddPointInfo
  | ModArgsMap
  | ModArgsRename;

export type ModArgsCustom = {
  key: string;
  args: any;
};

export type ModArgsFilter = {
  key: string;
  values: string[];
  replace?: boolean;
  origin?: boolean;
};

export type ModArgsFilterNested = {
  values: string[];
  hideParents: boolean;
  hideChildren: boolean;
};

export type ModArgsExclude = {
  key: string;
  values: string[];
  excludeAll: boolean;
  gate: number;
};

export type ModArgsStringTolabel = {
  value: string;
  target: DataPointTarget;
};

export type ModArgsTagTolabel = {
  categoryId: number;
  target: DataPointTarget;
  glue?: string;
};

export type ModArgsAddToOthers = {
  push?: number;
  match: DataPointTarget;
  mode: string;
};

export type ModArgsAddToNew = {
  key: DataPointTarget;
  values: string[];
  alias: string;
  mode: string;
};

export type ModArgsCalcDifference = {
  match: DataPointTarget;
  item: string;
  mode: string;
  revert: boolean;
};

export type ModArgsCalcSum = {
  match: DataPointTarget;
  items?: string[];
  mode: string;
  alias: string;
};

export type AggregatePoints = {
  alias: string;
  key: string;
  points: DataPoint[];
};

export type ModArgsAddMeta = {
  key: string;
  glue?: string;
  replace?: boolean;
  append?: boolean;
  asCell?: boolean;
};

export type ModArgsAddPointInfo = {
  key: string;
};

export type ModArgsMap = {
  source: number | DataPointTarget;
  target: DataPointTarget;
};

export type ModArgsRename = {
  renameStack: RenameLabel[];
};

export type ModArgsTranspose = {};
