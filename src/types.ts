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

export type DataPointFilter = {
  (points: DataPoint[]): DataPoint[]
}

export type DataGridFunction = {
  (tag: DataTag|string): DataPointFilter
}

export type DataGrid = {
  rows: DataPointFilter[],
  columns: DataPointFilter[],
  cell(points: DataPoint[]): ResultCell
}

export type CellKey = {
  [key: string]: string|boolean
}

export type ResultCell = number|string|null

export type ResultRow = {
  [key: string]: ResultCell
}

export type Result = {
  [key: string]: ResultRow
}