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

export type ResultRow = {
  [key: string]: ResultCell
}

export type Result = {
  [key: string]: ResultRow
}
