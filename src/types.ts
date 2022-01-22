
import {PrismaClient, Sheet, Tag } from "./client"
import { Gesstabs } from "./parser/gesstabs";
import { Generic } from ".";
import {Parser} from './parser/parser';
import ResultClass from './result';
import {TableRowStyle} from 'pptx-automizer/dist/types/table-types';
import {ChartValueStyle} from 'pptx-automizer/dist/types/chart-types';
import ResultInfo from './helper/resultInfo';
import TransformResult from './helper/transformResult';

export type StoreOptions = {
  replaceExisting?: boolean,
  runBefore?: (prisma: PrismaClient) => Promise<void>
}

export type ParserType = Parser|Generic|Gesstabs

export type ParserOptions = {
  separator?: string
  renderTags: (info: RawResultInfo[], pushCb: Tagger) => void
  renderHeader?: (cells: string[], meta: RawResultMeta[], parser: ParserType) => string[]
  renderRow: (cells: ResultCell[], label: string, meta: RawResultMeta[], parser: ParserType) => ResultCell[]
  renderLabel?: (label: string) => string
  metaMap: MetaMap
  significance?: ParserOptionsSignificance
  overcodes?: Overcodes[]
  skipRows: string[]
  worksheetId?: number
}

export type ParserOptionsSignificance = {
  cellSeparator: string,
  headerSeparator: string,
  headerFilter: string[],
  lettersKey: string,
  valueKey: string,
}

export type ResultCell = number|string|null

export type StoreSummary = {
  ids: number[],
  deleted: number[],
}

export type QueryOptions = {
  selectionValidator: SelectionValidator
}

export type SelectionValidator = {
  (tags: Tag[]): boolean
}

export type Selector = number[][]

export type DataTag = {
  id?: number
  category: string
  value: string
  categoryId?: number
}

export type DataPoint = {
  tags: DataTag[]
  row: string
  column: string
  value: ResultCell
  meta?: DataPointMeta[]
  origin?: DataPoint[]
  mode?: string
}

export type DataPointMeta = {
  key: string
  value: ResultCell | NestedParentValue[]
}

export type Datasheet = {
  id?: number
  tags: DataTag[]
  columns: string[]
  rows: string[]
  data: ResultCell[][]
  meta: RawResultMeta[]
}

export type Sheets = (Sheet & {
  tags: Tag[];
})[]

export type QueryResult = {
  result: string;
  sheets: string;
  tags: string;
  keys: string;
  inputKeys: string;
  visibleKeys: string;
}

export type QueryResultKeys = {
  row: string[];
  column: string[];
  category: QueryResultCategoryKeys[];
}

export type QueryResultCategoryKeys = {
  categoryId: number;
  keys: string[];
}

export type DataPointFilterResult = {
  points: DataPoint[]
  label: string
}

export type DataPointFilter = {
  (points: DataPoint[]): DataPointFilterResult
}

export type DataGridFunction = {
  (tag: DataTag|string, key?:string|string[]): DataPointFilter
}

export type DataGridCategories = {
  (keys: CellKeys) : DataPointFilter[]
}

export type DataGrid = {
  row: DataPointFilter[] | DataGridCategories,
  column: DataPointFilter[] | DataGridCategories,
  cell: DataResultCellFilter,
  modify?: DataPointModifier[]
  sort?: DataPointSortation[]
  transform?: DataGridTransformation[]
}

export type ResultCellInfo = {
  value: ResultCell,
  tags: Tag[]
}

export type DataResultCellFilter = {
  (points: DataPoint[]): ResultCell|DataPoint[]
}

export type DataPointModifier = {
  applyToLevel?: number[],
  executionOrder?: number,
  cb?: any
  callbacks?: any[]
}

export type DataPointSortation = {
  cb?: any
  section: DataPointTarget
}

export type DataGridTransformation = {
  cb?: any
  section: DataPointTarget
}

export type CellKey = {
  [key: string]: boolean
}

export type CellKeys = {
  [key: string]: CellKey
}

export type ResultColumn = {
  key: string,
  value: ResultCell | DataPoint[],
  style?: TableRowStyle | ChartValueStyle
}

export type ResultRow = {
  key: string,
  cols: ResultColumn[]
}

export type Result = {
  body: ResultRow[],
  info: ResultInfo
  transform: TransformResult
}

export type Tagger = {
  tags: DataTag[],
  push: (cat:string, val:string) => void
}

export type MetaMap = {
  [key: string]: string[]
}

export type MetaParam = {
  cb: (row: ResultRow, params: MetaParam, result: ResultClass) => TableRowStyle[] | ChartValueStyle[],
  styles: MetaParamStyle[]
}

export type MetaParamStyle = {
  key?: string,
  value?: string,
  keys?: string[],
  style: TableRowStyle|ChartValueStyle
}

export type Overcodes = {
  prefix: string;
  key: string;
  callback?: (label:string) => boolean
}

export type RawRow = ResultCell[]

export type RawResultMeta = {
  key: string;
  label: string;
  data?: RawRow|RawRow[];
  info?: RawResultInfo[];
}

export type RawResultInfo = {
  key: string;
  value: string;
  info?: string;
}

export type RawResultNestedParent = {
  level: number;
  key: string;
  label: string;
}

export type NestedParentValue = {
  label: string;
  value: ResultCell;
}

export type RawResultNestedItem = {
  label: string;
  parents: RawResultNestedParent[]
}

export type RawResultData = {
  info: RawResultInfo[],
  header: RawRow[],
  body: RawRow[],
  meta: RawResultMeta[]
  nested?: RawResultNestedItem[]
}

export type RawColumnSlice = {
  label: string,
  start: number,
  end: number,
  length: number
}

export type RawTable = {
  label: string,
  rows: string[],
  columns: string[],
  data: ResultCell[][],
  meta: RawResultMeta[]
}

export type DataPointTarget = 'row' | 'column'

export type RenameLabel = {
  target?: DataPointTarget
  targets?: DataPointTarget[]
  replace: string
  by: string
  cb?: (label:string) => string
  isPattern: boolean
}

export type ModifierCommandArgument =
    ModArgsCustom
  | ModArgsFilter
  | ModArgsFilterNested
  | ModArgsExclude
  | ModArgsStringTolabel
  | ModArgsTagTolabel
  | ModArgsAddToOthers
  | ModArgsAddMeta
  | ModArgsAddPointInfo
  | ModArgsMap
  | ModArgsRename

export type ModArgsCustom = {
  key: string
  args: any
}

export type ModArgsFilter = {
  key: string
  values: string[]
  replace?: boolean
  origin?: boolean
}

export type ModArgsFilterNested = {
  values: string[];
  hideParents: boolean;
  hideChildren: boolean;
}

export type ModArgsExclude = {
  key: string
  values: string[]
  excludeAll: boolean
}

export type ModArgsStringTolabel = {
  value: string
  target: DataPointTarget
}

export type ModArgsTagTolabel = {
  categoryId: number
  target: DataPointTarget
  glue?: string
}

export type ModArgsAddToOthers = {
  push?: number
  match: DataPointTarget
  mode: string
}

export type ModArgsAddToNew = {
  key: DataPointTarget
  values: string[]
  alias: string
  mode: string
}

export type ModArgsCalcDifference = {
  match: DataPointTarget
  item: string
  mode: string
}

export type ModArgsCalcSum = {
  match: DataPointTarget
  items?: string[]
  mode: string
  alias: string
}

export type AggregatePoints = {
  alias: string
  key: string
  points: DataPoint[]
}

export type ModArgsAddMeta = {
  key: string
  glue?: string
  replace?: boolean
}

export type ModArgsAddPointInfo = {
  key: string
}

export type ModArgsMap = {
  source: number|DataPointTarget
  target: DataPointTarget
}

export type ModArgsRename = {
  renameStack: RenameLabel[]
}

export type ModArgsTranspose = {}
