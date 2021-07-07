import { PrismaClient } from '@prisma/client'
import { Datasheet, TagWhereBySomeId, DataTag, Sheets, DataGrid, CellKey, DataPoint, Result, ResultRow, ResultCell } from './types'

export class Query {
  prisma: PrismaClient
  clause: any
  sheets: Datasheet[]
  keys: any
  points: DataPoint[]
  grid: DataGrid
  result: Result

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.sheets = []
    this.keys = {}
    this.result = <Result> {}
    this.points = <DataPoint[]> []
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
    this.setDataPoints()

    return this
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
  
  setDataPoints() {
    this.sheets.forEach(sheet => {
      sheet.data.forEach((points, r) => {
        points.forEach((point, c) => {
          this.points.push({
            tags: sheet.tags,
            row: sheet.rows[r],
            column: sheet.columns[c],
            value: point,
            meta: (sheet.meta) ? sheet.meta[r][c] : null,
          })
        })
      })
    })
  }

  merge(grid: DataGrid) {
    let points = <any> []
    grid.rows.forEach((row,r) => {
      let rowKey = 'row' + r
      this.result[rowKey] = <ResultRow> {}
      points[r] = row(this.points)
      grid.columns.forEach((column,c) => {
        let colKey = 'col' + c
        let cell = <ResultCell> grid.cell(column(points[r]))
        this.result[rowKey][colKey] = cell
      })
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
