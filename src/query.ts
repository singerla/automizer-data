import { PrismaClient } from '@prisma/client'
import { Datasheet, TagWhereBySomeId, DataTag, Sheets, DataGrid, CellKey } from './types'

export class Query {
  prisma: PrismaClient
  clause: any
  sheets: Datasheet[]
  keys: any
  points: any
  grid: DataGrid
  result: any

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.sheets = []
    this.keys = {}
    this.result = <any> {}
    this.points = <any> {}
    this.grid = <DataGrid> {}
  }

  async get(tags: DataTag[]): Promise<Query> {
    const ids = await this.getTagIds(tags)

    let clause = this.clauseCallback(ids[0])
    for(let i in ids) {
      if(Number(i) > 0) {
        this.setNestedClause(clause, ids[i])
      }
    }

    let sheets = await this.prisma.sheet.findMany({
      where: clause,
      include: {
        tags: true
      }
    })

    this.parseSheets(sheets)

    return this
  }

  merge(grid: DataGrid) {
    this.setDataPoints()
    this.grid = grid
    
    let single = <CellKey> {
      rows: false,
      columns: false
    }
    let cell = <CellKey> {}

    for(let key in this.keys) {
      let count = Object.keys(this.keys[key]).length
      if(count === 1) {
        single[key] = Object.keys(this.keys[key])[0]
      } else {
        if(grid.rows != key 
          && grid.columns != key) {
            cell[key] = true
        }
      }
    }

    const rows = Object.keys(this.keys[grid.rows])
    const columns = Object.keys(this.keys[grid.columns])
    const cells = Object.keys(cell)

    rows.forEach(rowKey => {
      if(!this.result[rowKey]) {
        this.result[rowKey] = {}
      }
      columns.forEach(columnKey => {
        if(!this.result[rowKey][columnKey]) {
          this.result[rowKey][columnKey] = {}
        }

        let key = single
        key[this.grid.rows] = rowKey
        key[this.grid.columns] = columnKey

        if(cells.length > 0) {
          this.setCellContentObject(cells, rowKey, columnKey, key)
        } else {
          this.setResultCell(key, rowKey, columnKey)
        }
      })
    })
    
    return this.result
  }

  setDataPoints() {
    this.sheets.forEach(sheet => {
      sheet.data.forEach((row, r) => {
        row.forEach((cell, c) => {
          let cellKey = this.getCellKey(sheet.tags, sheet.rows[r], sheet.columns[c])
          this.points[cellKey] = cell
        })
      })
    })
  }

  setCellContentObject(cells: string[], rowKey: string, columnKey: string, key: any) {
    cells.forEach(cellKey => {
      Object.keys(this.keys[cellKey]).forEach(cell => {
        key[cellKey] = cell
        this.setResultCell(key, rowKey, columnKey, cell)
      })
    })
  }

  setResultCell(key: CellKey, rowKey: string, columnKey: string, cell?: string) {
    let pointKey = JSON.stringify(key)
    if(this.points.hasOwnProperty(pointKey)) {
      if(cell) {
        this.result[rowKey][columnKey][cell] = this.points[pointKey]
      } else {
        this.result[rowKey][columnKey] = this.points[pointKey]
      }
    } else {
      
    }
  }

  getCellKey(tags: DataTag[], rowLabel:string, columnLabel:string): string {
    let key = <CellKey> {}
    tags.forEach(tag => {
      if(tag.categoryId) {
        let catId = tag.categoryId
        key[catId] = tag.value
        this.setKey(catId, tag.value)
      }
    })

    key['rows'] = rowLabel
    this.setKey('rows', rowLabel)

    key['columns'] = columnLabel
    this.setKey('columns', columnLabel)

    return JSON.stringify(key)
  }

  setKey(key: string|number, value: string|number) {
    if(!this.keys[key]) {
      this.keys[key] = {}
    }

    this.keys[key][value] = true
  }

  parseSheets(sheets: Sheets) {
    this.sheets = sheets.map(sheet => {
      return <Datasheet> {
        id: sheet.id,
        tags: sheet.tags.map(tag => {
          return {
            id: tag.id,
            value: tag.name,
            categoryId: tag.categoryId
          }
        }),
        rows: JSON.parse(sheet.rows),
        columns: JSON.parse(sheet.columns),
        data: JSON.parse(sheet.data),
        meta: JSON.parse(sheet.meta),
      }
    })    
  }

  clauseCallback = function (id: number): TagWhereBySomeId {
    return {
      tags: {
        some: {
          id: id
        }
      }
    }
  }

  setNestedClause(clause:any, id:number): void {
    if(!clause.AND) {
      clause.AND = this.clauseCallback(id)
    } else {
      this.setNestedClause(clause.AND, id)
    }
  }

  async getTagIds(tags: DataTag[]): Promise<number[]> {
    for(let i in tags) {
      let tag = tags[i]
      await this.setCategoryId(tag)
      await this.setTagId(tag)
    }

    return tags.map(tag => <number> tag.id)
  }

  async setCategoryId(tag: DataTag): Promise<void> {
    if(tag.categoryId) return

    const categoryItem = await this.prisma.category.findFirst({
      where: {
        name: tag.category
      }
    })

    if(!categoryItem) {
      throw new Error(`Category not found: ${tag.category}`)
    }

    tag.categoryId = categoryItem.id
  }

  async setTagId(tag: DataTag): Promise<void> {
    if(tag.id) return

    const tagItem = await this.prisma.tag.findFirst({
      where: {
        categoryId: tag.categoryId,
        name: tag.value
      }
    })

    if(!tagItem) {
      throw new Error(`Tag not found: ${tag.value} @ category: ${tag.category}`)
    }

    tag.id = tagItem.id
  }
}
