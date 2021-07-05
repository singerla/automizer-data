import { Sheet, Tag } from "@prisma/client"

export type DataTag = {
  id?: number
  category: string
  value: string
  categoryId?: number
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

export type DataGrid = {
  rows: string|number,
  columns: string|number
}

export type CellKey = {
  [key: string]: string|boolean
}