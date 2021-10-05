import {PrismaClient, Tag} from './client'
import { getNestedClause } from './helper'

import {
  Datasheet,
  TagWhereBySomeId,
  DataTag,
  Sheets,
  DataGrid,
  DataPoint,
  Result,
  ResultRow,
  CellKeys,
  DataPointFilter
} from './types';

import { ChartData, ChartCategory } from 'pptx-automizer/dist/types/chart-types';
import { TableData } from 'pptx-automizer/dist/types/table-types';
import _ from "lodash";

export class Query {
  prisma: PrismaClient
  clause: any
  sheets: Datasheet[]
  allSheets: Datasheet[]
  keys: CellKeys
  points: DataPoint[]
  grid: DataGrid
  result: Result
  tags: any[]

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.sheets = []
    this.keys = <CellKeys> {}
    this.result = <Result> {
      body: <ResultRow[]> []
    }
    this.points = <DataPoint[]> []
    this.grid = <DataGrid> {}
    this.allSheets = <Datasheet[]> []
    this.tags = <any>[]
  }

  async get(tags: DataTag[] | DataTag[][]): Promise<Query> {
    const allTags = (tags[0].hasOwnProperty('category'))
      ? [ tags ] : tags

    for(const i in allTags) {
      const sheets = await this.getSheets(<DataTag[]> allTags[i])
      this.parseSheets(sheets)
      this.setDataPoints()
    }

    return this
  }

  async getByIds(allTagIds: number[][]): Promise<Query> {
    for(const tagIds of allTagIds) {
      const selectionTags = await this.getSelectionTags(tagIds)

      this.tags.push(selectionTags)

      const sheets = await this.getSheetsByTags(selectionTags)
      if(sheets.length > 0) {
        this.parseSheets(sheets)
        this.setDataPoints()
      }
    }

    return this
  }

  async getSelectionTags(tagIds: number[]): Promise<Tag[]> {
    return this.prisma.tag.findMany({
      where: {
        id: {
          in: tagIds
        }
      }
    });
  }

  async getSheets(tagStrings: DataTag[]): Promise<Sheets> {
    const dataTags = await this.getTags(tagStrings)
    const tags = <Tag[]> []
    dataTags.forEach(dataTag => {
      const tag = <Tag> {
        id: dataTag.id,
        name: dataTag.value,
        categoryId: dataTag.categoryId
      }
      tags.push(tag)
    })
    return this.findSheets(tags)
  }

  async getSheetsByTags(tags:Tag[]): Promise<Sheets> {
    const sheets = await this.findSheets(tags)
    return sheets
  }

  async getSheetsById(ids:number[]): Promise<Sheets> {
    const selectionTags = await this.prisma.tag.findMany({
      where: {
        id: {
          in: ids
        }
      }
    })
    const sheets = await this.findSheets(selectionTags)
    return sheets
  }

  async findSheets(tags:Tag[]): Promise<Sheets> {
    let clause = getNestedClause(tags)

    let sheets = await this.prisma.sheet.findMany({
      where: clause,
      include: {
        tags: true
      }
    })

    return sheets
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

    this.allSheets.push(...this.sheets)
  }

  setDataPoints() {
    this.sheets.forEach(sheet => {
      sheet.tags.forEach(tag => {
        if(tag.categoryId) {
          this.addKey(String(tag.categoryId), tag.value)
        }
      })

      sheet.data.forEach((points, r) => {
        points.forEach((point: any, c: number) => {
          this.points.push({
            tags: sheet.tags,
            row: sheet.rows[r],
            column: sheet.columns[c],
            value: point,
            //meta: (sheet.meta && sheet.meta[r] && sheet.meta[r][c]) ? sheet.meta[r][c] : null,
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
    let result = <any> {}

    rows.forEach((rowCb,r) => {
      let rowCbResult = rowCb(this.points)
      points[r] = rowCbResult.points

      let rowKey = rowCbResult.label
      result[rowKey] = <ResultRow> {}
      columns.forEach((columnCb,c) => {
        let cellPoints = columnCb(points[r])

        let colKey = cellPoints.label
        result[rowKey][colKey] = grid.cell(cellPoints.points)
      })
    })

    this.setResult(result)

    return this
  }

  clone() {
    return _.cloneDeep(this)
  }

  checkForCallback(cb: any, keys: CellKeys): DataPointFilter[] {
    return (typeof cb === 'function')
      ? cb(keys)
      : cb
  }

  async getTagIds(tags: DataTag[]): Promise<number[]> {
    for(let i in tags) {
      let tag = tags[i]
      await this.setCategoryId(tag)
      await this.setTagId(tag)
    }

    return tags.map(tag => <number> tag.id)
  }

  async getTags(tags: DataTag[]): Promise<DataTag[]> {
    for(let i in tags) {
      let tag = tags[i]
      await this.setCategoryId(tag)
      await this.setTagId(tag)
    }

    return tags
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

  setResult(result: any): void {
    for(const r in result) {
      const cols = []
      for(const c in result[r]) {
        cols.push({
          key: c,
          value: result[r][c]
        })
      }

      this.result.body.push({
        key: r,
        cols: cols
      })
    }
  }

  filterColumns(columns: number|number[]): Query {
    let targetColumns = <number[]> []
    targetColumns = (typeof (columns) !== 'object') ? [ columns ] : columns

    this.result.body.forEach((row, r) => {
      if(row.cols) {
        this.result.body[r].cols = row.cols.filter((col,c) => {
          return targetColumns.indexOf(c) >= 0
        })
      }
    })

    return this
  }

  sort(cb: any): Query {
    this.result.body.sort((a, b) => cb(a, b))
    return this
  }

  toSeriesCategories(): ChartData {
    if(this.result.body[0]) {
      const series = this.result.body[0].cols.map(col => { return { label: col.key } } )
      const categories = <ChartCategory[]> []

      this.result.body.forEach(row => {
        categories.push({
          label: row.key,
          values: row.cols.map(cell => { return <number> cell.value })
        })
      })

      return {
        series: series,
        categories: categories
      }
    }

    return {
      series: [],
      categories: []
    }
  }

  toVerticalLines(): ChartData {
    const series = this.result.body[0].cols.map(col => { return { label: col.key } } )
    const categories = <ChartCategory[]> []

    this.result.body.forEach((row, r) => {
      categories.push({
        label: row.key,
        y: r,
        values: row.cols.map(cell => { return <number> cell.value })
      })
    })

    return {
      series: series,
      categories: categories
    }
  }

  toLabels(): TableData {
    return {
      body: this.result.body.map(row => {
        return {
          values: [ row.key ]
        }
      })
    }
  }

  toRowLabels(): TableData {
    return this.toLabels()
  }

  toColumnLabels(): TableData {
    const series = this.result.body[0].cols.map(col => col.key)
    return {
      body: [
        {
          values: series
        }
      ]
    }
  }

  toTable(): TableData {
    return {
      body: this.result.body.map(row => {
        return {
          values: row.cols.map(cell => { return <number> cell.value } )
        }
      }),
    }
  }
}
