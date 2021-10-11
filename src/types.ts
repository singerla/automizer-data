import {PrismaClient, Sheet, Tag } from "./client"

export type StoreOptions = {
  replaceExisting?: boolean,
  runBefore?: (prisma: PrismaClient) => Promise<void>
}

export type ParserOptions = {
  separator: string
  renderRow: (cells: ResultCell[]) => ResultCell[]
  renderTags: (info: RawResultInfo[], pushCb: Tagger) => void
  metaMap: MetaMap
  skipRows: string[]
}

export type ResultCell = number|string|null

export type StoreSummary = {
  ids: number[],
  deleted: number[],
}


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
}

export type DataPointMeta = {
  key: string
  value: ResultCell
}

export type Datasheet = {
  id?: number
  tags: DataTag[]
  columns: string[]
  rows: string[]
  data: ResultCell[][]
  meta: RawResultMeta[]
}

export type TagWhereBySomeId = {
  tags: {
    some: {
      id: number;
    };
    AND?: TagWhereBySomeId
  };
}

export type Sheets = (Sheet & {
  tags: Tag[];
})[]

export type DataPointFilterResult = {
  points: DataPoint[]
  label: string
}

export type DataPointFilter = {
  (points: DataPoint[]): DataPointFilterResult
}

export type DataGridFunction = {
  (tag: DataTag|string, key?:string): DataPointFilter
}

export type DataGridCategories = {
  (keys: CellKeys) : DataPointFilter[]
}

export type DataGrid = {
  rows: DataPointFilter[] | DataGridCategories,
  columns: DataPointFilter[] | DataGridCategories,
  cell: DataResultCellFilter,
  modify?: DataPointModifier[]
}

export type DataResultCellFilter = {
  (points: DataPoint[]): ResultCell
}

export type DataPointModifier = {
  applyToLevel?: number[],
  cb?: any
  callbacks?: any[]
}

export type CellKey = {
  [key: string]: boolean
}

export type CellKeys = {
  [key: string]: CellKey
}

export type ResultColumn = {
  key: string,
  value: ResultCell
}

export type ResultRow = {
  key: string,
  cols: ResultColumn[]
}

export type Result = {
  body: ResultRow[]
}

export type Tagger = {
  tags: DataTag[],
  push: (cat:string, val:string) => void
}

export type MetaMap = {
  [key: string]: string[]
}

export type RawRow = ResultCell[]

export type RawResultMeta = {
  key: string,
  label: string
  data: RawRow|RawRow[],
}

export type RawResultInfo = {
  key: string
  value: string,
}

export type RawResultData = {
  info: RawResultInfo[],
  header: RawRow[],
  body: RawRow[],
  meta: RawResultMeta[]
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
  replace?: string
  by?: string
  cb?: (label:string) => string
}

type NewType = ModArgsFilter

export type ModifierCommandArgument = 
    ModArgsFilter
  | ModArgsStringTolabel
  | ModArgsTagTolabel
  | ModArgsAddToOthers
  | ModArgsAddMeta
  | ModArgsMap
  | ModArgsRename

export type ModArgsFilter = {
  key: string
  value:string
  replace?:boolean
}

export type ModArgsStringTolabel = {
  value: string
  target:'row'|'column'
}

export type ModArgsTagTolabel = {
  categoryId: number
  target:'row'|'column'
  glue?: string
}

export type ModArgsAddToOthers = {
  push?: number
  match:'row'|'column'
}

export type ModArgsAddMeta = {
  key: string
  glue?: number
}

export type ModArgsMap = {
  categoryId: number
  target: 'row'|'column'
}

export type ModArgsRename = {
  renameStack: RenameLabel[]
}