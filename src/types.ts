import { Sheet, Tag } from "@prisma/client"


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
  value: number|string|null
  meta: number|string|null
}

export type Datasheet = {
  id?: number
  tags: DataTag[]
  columns: string[]
  rows: string[]
  data: (null[]|string[]|number[])[]
  meta: null|string[][]
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
  cell(points: DataPoint[]): ResultCell
}

export type CellKey = {
  [key: string]: boolean
}

export type CellKeys = {
  [key: string]: CellKey
}

export type ResultCell = number|string|null

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

export type ParserConfig = {
  separator: string
  variablePrefix: string
  varTitlePrefix: string
  renderVariable: (info: string) => string
  renderRow: (cells: string[]) => (string|number|null)[]
  renderTags: (tags: DataTag[]) => DataTag[]
  basePrefix: string
  skipRows: string[]
}

export type CsvRow = {
  [key: string] : string
}

export type RawResultMeta = {
  significance: (string|number|null)[][]
  base: CsvRow[]
}

export type RawResultData = {
  info: string[],
  header: CsvRow[],
  body: CsvRow[],
  meta: RawResultMeta
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
  data: (string|number|null)[][]
}

export type StoreOptions = {
  replace?: boolean
}

export type StoreSummary = {
  ids: number[],
  deleted: number
}