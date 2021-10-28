import {PrismaClient, Tag} from './client'
import { getNestedClause, vd } from './helper'

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
  DataPointFilter, DataPointModifier, DataPointSortation
} from './types';

import Points from './points'

import { ChartData, ChartCategory } from 'pptx-automizer/dist/types/chart-types';
import { TableData } from 'pptx-automizer/dist/types/table-types';
import _ from "lodash";

export class Query {
  prisma: PrismaClient
  clause: any
  sheets: Datasheet[]
  allSheets: Datasheet[]
  keys: CellKeys
  visibleKeys: {
    row: string[],
    column: string[]
  }
  points: DataPoint[]
  grid: DataGrid
  result: Result
  tags: any[]

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.sheets = []
    this.keys = <CellKeys> {}
    this.visibleKeys = {
      row: [],
      column: []
    }
    this.result = <Result> {
      body: <ResultRow[]> []
    }
    this.points = <DataPoint[]> []
    this.grid = <DataGrid> {}
    this.allSheets = <Datasheet[]> []
    this.tags = <any>[]

    return this
  }

  setGrid(grid:DataGrid) {
    this.grid = grid
    return this
  }

  async get(tags: DataTag[] | DataTag[][]): Promise<Query> {
    const allTagIds = (tags[0].hasOwnProperty('category'))
      ? [ tags ] : tags

    for(const level in allTagIds) {
      const tagIds = allTagIds[level]
      const sheets = await this.getSheets(<DataTag[]> tagIds)
      this.processSheets(sheets, Number(level))
    }

    this.setDataPointKeys()
    return this
  }

  async getByIds(allTagIds: number[][]): Promise<Query> {
    for(const level in allTagIds) {
      const tagIds = allTagIds[level]
      const selectionTags = await this.getTagInfo(tagIds)
      this.tags.push(selectionTags)

      const sheets = await this.getSheetsByTags(selectionTags)
      this.processSheets(sheets, Number(level))
    }

    this.setDataPointKeys()
    return this
  }

  processSheets(sheets: Sheets, level: number) {
    const dataPoints = <DataPoint[]>[]
    if(sheets.length > 0) {
      this.parseSheets(sheets)
      this.setDataPoints(dataPoints)
      this.modifyDataPoints(dataPoints, level)
    }
    this.pushDataPoints(dataPoints)
  }

  async getTagInfo(tagIds: number[]): Promise<Tag[]> {
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
    if(!clause) return []

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

  setDataPoints(dataPoints:DataPoint[]): DataPoint[] {
    this.sheets.forEach(sheet => {
      sheet.data.forEach((points, r) => {
        points.forEach((point: any, c: number) => {
          dataPoints.push({
            tags: sheet.tags,
            row: sheet.rows[r],
            column: sheet.columns[c],
            value: point,
            meta: this.getDataPointMeta(sheet.meta, r, c)
          })
        })
      })
    })
    return dataPoints
  }

  getDataPointMeta(meta:any, r:number, c:number) {
    const pointMeta = <any>[]

    meta.forEach((metaContent:any) => {
      if(metaContent?.data) {
        if(this.metaHasRows(metaContent?.data)) {
          this.pushPointMeta(pointMeta, metaContent.key, metaContent.data[r][c])
        } else {
          this.pushPointMeta(pointMeta, metaContent.key, metaContent.data[c])
        }
      }
    })
    return pointMeta
  }

  metaHasRows(metaData:any) {
    return (metaData[0] && Array.isArray(metaData[0]))
  }

  pushPointMeta(pointMeta:any, key:string, value:any) {
    pointMeta.push({
      key: key,
      value: value
    })
  }

  modifyDataPoints(dataPoints:DataPoint[], level: number): void {
    const modifiers = this.getDatapointModifiersByLevel(level)
    const points = new Points(dataPoints)

    modifiers.forEach(modifier => {
      if(modifier.cb) {
        modifier.cb(points)
      }

      if(modifier.callbacks) {
        modifier.callbacks.forEach(callback => {
          if(typeof callback === 'function') {
            callback(points)
          }
        })
      }
    })
  }

  getDatapointModifiersByLevel(level:number): DataPointModifier[] {
    const modifiers = <DataPointModifier[]> []

    this.grid?.modify?.forEach(modifier => {
      if(modifier.applyToLevel && modifier.applyToLevel.indexOf(level) > -1) {
        modifiers.push(modifier)
      } else if(!modifier.applyToLevel) {
        modifiers.push(modifier)
      }
    })
    return modifiers
  }

  pushDataPoints(dataPoints:DataPoint[]): void {
    this.points.push(...dataPoints)
  }

  setDataPointKeys() {
    this.points.forEach((point: any, c: number) => {
      this.addKey('row', point.row)
      this.addKey('column', point.column)
      point.tags.forEach((tag:DataTag) => {
        if(tag.categoryId) {
          this.addKey(String(tag.categoryId), tag.value)
        }
      })
    })
  }

  addKey(category: string, value: string) {
    if(!this.keys[category]) {
      this.keys[category] = {}
    }

    this.keys[category][value] = true
  }

  merge() {
    let rows = this.checkForCallback(this.grid.row, this.keys)
    let columns = this.checkForCallback(this.grid.column, this.keys)

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
        result[rowKey][colKey] = this.grid.cell(cellPoints.points)
      })
    })

    this.setResult(result)

    if(this.grid.sort) {
      this.sortResult(this.grid.sort)
    }

    return this
  }

  clone() {
    return _.cloneDeep(this)
  }

  checkForCallback(cb: any, keys: CellKeys): DataPointFilter[] {
    const cbResult = (typeof cb === 'function')
      ? cb(keys)
      : cb

    return cbResult
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
      this.visibleKeys.row.push(r)

      for(const c in result[r]) {
        this.visibleKeys.column.push(c)

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

    this.visibleKeys.column = [...new Set(this.visibleKeys.column)]
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

  sortResult(sortation:DataPointSortation[]) {
    try {
      sortation.forEach(sort => {
        if(sort.cb && typeof sort.cb === 'function') {
          sort.cb(this.result, this.points)
        }
      })
    } catch (e) {
      throw e
    }
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
