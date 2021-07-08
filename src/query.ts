import { PrismaClient } from '@prisma/client'
import {
  Datasheet,
  TagWhereBySomeId,
  DataTag,
  Sheets,
  DataGrid,
  CellKey,
  DataPoint,
  Result,
  ResultRow,
  ResultCell,
  CellKeys, DataGridCategories, DataPointFilter,
} from './types';

export class Query {
  prisma: PrismaClient
  clause: any
  sheets: Datasheet[]
  keys: CellKeys
  points: DataPoint[]
  grid: DataGrid
  result: Result

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.sheets = []
    this.keys = <CellKeys> {}
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
      sheet.tags.forEach(tag => {
        if(tag.categoryId) {
          this.addKey(String(tag.categoryId), tag.value)
        }
      })

      sheet.data.forEach((points, r) => {
        points.forEach((point, c) => {
          this.points.push({
            tags: sheet.tags,
            row: sheet.rows[r],
            column: sheet.columns[c],
            value: point,
            meta: (sheet.meta) ? sheet.meta[r][c] : null,
          })

          this.addKey('row', sheet.rows[r])
          this.addKey('column', sheet.columns[c])
        })
      })
    })
  }

  addKey(category: string, value: string) {
    if(!this.keys[category]) {
      this.keys[category] = {}
    }

    this.keys[category][value] = true
  }

  merge(grid: DataGrid) {
    let rows = this.checkForCallback(grid.rows, this.keys)
    let columns = this.checkForCallback(grid.columns, this.keys)

    let points = <any> []
    rows.forEach((rowCb,r) => {
      let rowCbResult = rowCb(this.points)
      points[r] = rowCbResult.points
      let rowKey = rowCbResult.label
      this.result[rowKey] = <ResultRow> {}
      columns.forEach((columnCb,c) => {
        let cellPoints = columnCb(points[r])
        let colKey = cellPoints.label
        let cell = grid.cell(cellPoints.points)
        this.result[rowKey][colKey] = cell
      })
    })

    return this
  }

  toSeriesCategories() {
    let series = <any> {}
    let categories = []
    for(let r in this.result) {
      let values = []
      for(let c in this.result[r]) {
        series[c] = {
          label: c
        }
        values.push(this.result[r][c])
      }
      categories.push({
        label: r,
        values: values
      })
    }

    return {
      series: Object.values(series),
      categories: categories
    }
  }

  checkForCallback = function(cb: any, keys: CellKeys): DataPointFilter[] {
    return (typeof cb === 'function')
      ? cb(keys)
      : cb
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
