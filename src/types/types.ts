import { PrismaClient, Sheet, Tag } from "../client";
import { Gesstabs } from "../parser/gesstabs";
import { Generic } from "../index";
import { Parser } from "../parser/parser";
import ResultClass from "../result";
import { ChartValueStyle, TableRowStyle } from "pptx-automizer";
import ResultInfo from "../helper/resultInfo";
import TransformResult from "../helper/transformResult";
import Modelizer from "../modelizer";
import { ModelizerOptions } from "./modelizer-types";

export type PrismaId = number;

export type StoreOptions = {
  replaceExisting?: boolean;
  runBefore?: (prisma: PrismaClient) => Promise<void>;
  filename?: string;
  userId?: PrismaId;
  statusTracker?: StatusTracker["next"];
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
    slice: RawColumnSlice
  ) => string[];
  renderRow: (
    cells: ResultCell[],
    label: string,
    meta: RawResultMeta[],
    parser: ParserType
  ) => ResultCell[];
  renderLabel?: (label: string) => string;
  renderRawResultData?: (data: RawResultData, parser: ParserType) => void;
  renderRawTables?: (
    rawTables: RawTable[],
    tags: DataTag[],
    parser: ParserType
  ) => void;
  metaMap: MetaMap;
  significance?: ParserOptionsSignificance;
  overcodes?: Overcodes[];
  skipRows: string[];
  worksheetId?: number;
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

export type QueryOptions = {
  selector: Selector;
  selectionValidator?: SelectionValidator;
  enableSelectionValidator?: boolean;
  nonGreedySelector?: boolean;
  grid?: DataGrid;
  merge?: boolean;
  prisma?: PrismaClient;
  useModelizer?: boolean;
  modelizer?: ModelizerOptions;
};

export type SelectionValidator = {
  (tags: Tag[]): boolean;
};

export type CategoryCount = {
  sheetId: PrismaId;
  categoryIds: PrismaId[];
};

export type IdSelector = PrismaId[];
export type Selector = DataTag[] | DataTag[][] | IdSelector[];

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
  tags: DataTag[];
  row: string;
  column: string;
  value: ResultCell;
  meta?: DataPointMeta[];
  origin?: DataPoint[];
  mode?: string;
  style?: TableRowStyle | ChartValueStyle;
  getMeta: (key: string) => DataPointMeta | undefined;
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
  result: string;
  sheets: string;
  tags: string;
  keys: string;
  inputKeys: string;
  visibleKeys: string;
};

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
  row: DataPointFilter[] | DataGridCategories;
  column: DataPointFilter[] | DataGridCategories;
  cell: DataResultCellFilter;
  modify?: DataPointModifier[];
  sort?: DataPointSortation[];
  transform?: DataGridTransformation[];
  options?: QueryOptions;
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

export type DataPointModifier = {
  applyToLevel?: number[];
  executionOrder?: number;
  cb?: any;
  callbacks?: any[];
};

export type DataPointSortation = {
  cb?: any;
  section: DataPointTarget;
};

export type DataGridTransformation = {
  cb?: (result: Result, mod: Modelizer, points: DataPoint[]) => void;
  modelize?: (args: any) => void;
  condition?: (args: any) => boolean;
  section: DataPointTarget;
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
  getPoint: (index?: number) => DataPoint;
};

export type ResultRow = {
  key: string;
  cols: ResultColumn[];
  getColumn: (colId: number) => ResultColumn;
};

export type Result = {
  isValid: () => boolean;
  body: ResultRow[];
  modelizer: Modelizer;
  fromModelizer: (modelizer: Modelizer) => void;
  toModelizer: (result: Result) => Modelizer;
  info: ResultInfo;
  transform: TransformResult;
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
    result: ResultClass
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

export type DataPointTarget = "row" | "column";

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
