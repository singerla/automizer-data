import {PrismaClient, Tag} from './client'
import { getNestedClause, vd } from './helper'

import {
  Datasheet,
  DataTag,
  Sheets,
  DataGrid,
  DataPoint,
  Result,
  ResultRow,
  CellKeys,
  DataPointFilter,
  DataPointModifier,
  DataPointSortation,
  QueryResultKeys,
  DataGridTransformation,
  Selector,
  NestedParentValue,
  RawResultMeta,
  DataPointMeta,
  SelectionValidator,
  QueryOptions, ResultColumn, ResultCell,
} from './types';

import Points from './points'

import _ from "lodash";
import ResultInfo from './helper/resultInfo';
import TransformResult from './helper/transformResult';

export default class Query {
  prisma: PrismaClient
  clause: any
  sheets: Datasheet[]
  allSheets: Datasheet[]
  inputKeys: CellKeys
  keys: CellKeys
  visibleKeys: {
    row: string[],
    column: string[]
  }
  points: DataPoint[]
  grid: DataGrid
  selectionValidator: SelectionValidator
  result: Result
  tags: any[]

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.sheets = []
    this.inputKeys = <CellKeys> {}
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
    this.selectionValidator = <SelectionValidator> () => true
    this.allSheets = <Datasheet[]> []
    this.tags = <any>[]

    return this
  }

  setGrid(grid:DataGrid): this {
    this.grid = grid
    return this
  }

  setOptions(options?:QueryOptions): this {
    if(options?.selectionValidator) {
      this.setSelectionValidator(options.selectionValidator)
    }
    return this
  }

  setSelectionValidator(validator:SelectionValidator): void {
    this.selectionValidator = validator
  }

  async get(tags: DataTag[] | DataTag[][]): Promise<Query> {
    const allTagIds = (tags[0].hasOwnProperty('category'))
      ? [ tags ] : tags

    for(const level in allTagIds) {
      const tagIds = allTagIds[level]
      const sheets = await this.getSheets(<DataTag[]> tagIds)
      this.processSheets(sheets, Number(level))
    }

    this.setDataPointKeys(this.points, 'keys')

    return this
  }

  async getByIds(allTagIds: Selector): Promise<Query> {
    for(const level in allTagIds) {
      const tagIds = allTagIds[level]
      const selectionTags = await this.getTagInfo(tagIds)
      const isValid = this.selectionValidator(selectionTags)

      if(isValid) {
        this.tags.push(selectionTags)
        const sheets = await this.getSheetsByTags(selectionTags)
        this.processSheets(sheets, Number(level))
      }
    }

    this.setDataPointKeys(this.points, 'keys')

    return this
  }

  processSheets(sheets: Sheets, level: number) {
    const dataPoints = <DataPoint[]>[]
    if(sheets.length > 0) {
      this.parseSheets(sheets)
      this.setDataPoints(dataPoints)
      this.setDataPointKeys(dataPoints, 'inputKeys')
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
        points.forEach((value: ResultCell, c: number) => {
          const dataPoint = <DataPoint> {
            tags: sheet.tags,
            row: sheet.rows[r],
            column: sheet.columns[c],
            value: value,
            meta: this.getDataPointMeta(sheet, r, c),
            getMeta: () => undefined
          }
          dataPoint.getMeta = Query.getMetaCb(dataPoint)
          dataPoints.push(dataPoint)
        })
      })
    })
    return dataPoints
  }

  getDataPointMeta(sheet:Datasheet, r:number, c:number): DataPointMeta[] {
    const pointMeta = <DataPointMeta[]>[]

    sheet.meta.forEach((metaContent:any) => {
      if(metaContent?.key === 'nested') {
        this.pushPointNestedMeta(metaContent, pointMeta, sheet, r, c)
      } else if(metaContent?.data) {
        if(this.metaHasRows(metaContent?.data)) {
          this.pushPointMeta(pointMeta, metaContent.key, metaContent.data[r][c])
        } else {
          this.pushPointMeta(pointMeta, metaContent.key, metaContent.data[c])
        }
      }

      if(metaContent?.info && metaContent.label === sheet.rows[r]) {
        this.pushPointInfo(metaContent, pointMeta, sheet, r, c)
      }
    })

    return pointMeta
  }

  pushPointInfo(metaContent:RawResultMeta, pointMeta:DataPointMeta[], sheet:Datasheet, r:number, c:number) {
    const hasMetaContent = metaContent.info?.find(meta => meta.value === sheet.columns[c])
    if(hasMetaContent && hasMetaContent.info) {
      this.pushPointMeta(pointMeta, hasMetaContent.info, hasMetaContent.key)
    }
  }

  pushPointNestedMeta(metaContent:any, pointMeta:any, sheet:any, r:number, c:number) {
    if(metaContent.label === sheet.rows[r]) {
      const parentValues = <NestedParentValue[]>[]
      metaContent.data.forEach((parentLabel: string) => {
        const parentRow = sheet.rows.indexOf(parentLabel)
        parentValues.push({
          label: parentLabel,
          value: sheet.data[parentRow][c]
        })
        if(parentLabel === metaContent.label) {
          this.pushPointMeta(pointMeta, 'isParent', true)
        }
      })
      this.pushPointMeta(pointMeta, metaContent.key, parentValues)
    }
  }

  metaHasRows(metaData:any): boolean {
    return (metaData[0] && Array.isArray(metaData[0]))
  }

  pushPointMeta(pointMeta:DataPointMeta[], key:string, value:any) {
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
      } else if(!modifier.applyToLevel || modifier.applyToLevel.length === 0) {
        modifiers.push(modifier)
      }
    })
    return modifiers
  }

  pushDataPoints(dataPoints:DataPoint[]): void {
    this.points.push(...dataPoints)
  }

  setDataPointKeys(dataPoints:DataPoint[], mode: 'keys'|'inputKeys') {
    dataPoints.forEach((point: DataPoint, c: number) => {
      this.addKey('row', point.row, mode)
      this.addKey('column', point.column, mode)
      this.addNestedKeys(point, mode)
      point.tags.forEach((tag:DataTag) => {
        if(tag.categoryId) {
          this.addKey(String(tag.categoryId), tag.value, mode)
        }
      })
    })
  }

  addNestedKeys(point: DataPoint, mode: 'keys'|'inputKeys') {
    const hasNestedMeta = point?.meta?.find((meta: any) => meta.key === 'nested')
    if(hasNestedMeta && Array.isArray(hasNestedMeta.value)) {
      hasNestedMeta?.value?.forEach((nested:NestedParentValue) => {
        this.addKey('nested', nested.label, mode)
      })
    }
  }

  addKey(category: string, value: string, mode: 'keys'|'inputKeys') {
    if(!this[mode][category]) {
      this[mode][category] = {}
    }

    this[mode][category][value] = true
  }

  async merge() {
    let rows = this.checkForCallback(this.grid.row, this.keys, this.points)
    let columns = this.checkForCallback(this.grid.column, this.keys, this.points)

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

    if(this.grid.transform) {
      await this.transformResult(this.grid.transform)
    }

    return this
  }

  clone() {
    return _.cloneDeep(this)
  }

  checkForCallback(cb: any, keys: CellKeys, points:DataPoint[]): DataPointFilter[] {
    const cbResult = (typeof cb === 'function')
      ? cb(keys, points)
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
      const cols = <ResultColumn[]>[]
      this.visibleKeys.row.push(r)

      for(const c in result[r]) {
        this.visibleKeys.column.push(c)

        cols.push({
          key: c,
          value: result[r][c],
          getPoint: Query.getPointCb(result[r][c])
        })
      }

      this.result.body.push({
        key: r,
        cols: cols,
        getColumn: Query.getColumnCb(cols)
      })
    }

    this.result.isValid = (): boolean => {
      if(this.result.body && this.result.body[0] && this.result.body[0].cols) {
        return true
      }
      return false
    }
    this.result.info = new ResultInfo(this.result)
    this.result.transform = new TransformResult(this.result)

    this.visibleKeys.column = [...new Set(this.visibleKeys.column)]
  }

  static getPointCb(points: DataPoint[]) {
    return (index?:number): DataPoint => {
      const point = points[index || 0]
      return point
    }
  }

  static getColumnCb(cols: ResultColumn[]) {
    return (colId?:number): ResultColumn => {
      return cols[colId || 0]
    }
  }

  static getMetaCb(point: DataPoint) {
    return (key:string): DataPointMeta | undefined => {
      if(point.meta) {
        return point.meta.find(meta => meta.key === key)
      }
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

  async transformResult(transformations:DataGridTransformation[]) {
    if(!this.result.isValid()) {
      return
    }
    try {
      for(const transform of transformations) {
        if(transform.cb && typeof transform.cb === 'function') {
          await transform.cb(this.result, this.points)
        }
      }
    } catch (e) {
      throw e
    }
  }
}
