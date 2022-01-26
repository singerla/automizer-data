import {DataPoint, ResultCell, ResultRow, ResultColumn, Result} from '../types';
import { vd } from '../helper';
export type RowCallback = {
  (row: ResultRow, r:number): void
}
export type ColumnCallback = {
  (col: ResultColumn, c:number, row: ResultRow): void
}
export type ValueCallback = {
  (points: DataPoint[], c:number, r:number, col: ResultColumn): void
}
export type DataPointCallback = {
  (point: DataPoint, c:number, r:number, id:number): void
}

export type Input = {
  body: ResultRow[]
}

export default class TransformResult {
  result: Result

  constructor(result:Result) {
    this.result = result
  }

  forEachRow(cb:RowCallback): this {
    this.result.body.forEach((row: ResultRow, r:number) => {
      cb(row, r)
    })
    return this
  }

  forEachColumn(row: ResultRow | number, cb:ColumnCallback): this {
    const targetRow = this.getRow(row)
    targetRow.cols.forEach((col: ResultColumn, c:number) => {
      cb(col, c, targetRow)
    })
    return this
  }

  forEachValue(cb: ValueCallback): this {
    this.forEachRow((row, r) => {
      this.forEachColumn(row, (col, c) => {
        const points = this.getDataPoints(col)
        cb(points, r, c, col)
      })
    })
    return this
  }

  forEachDataPoint(cb: DataPointCallback): this {
    this.forEachValue((points, r, c, col) => {
      points.forEach((point: DataPoint, id:number) => {
        cb(point, r, c, id)
      })
    })
    return this
  }

  getRow(row: ResultRow | number): ResultRow {
    return (typeof row === 'number')
      ? this.result.body[row]
      : row
  }

  getDataPoints(col: ResultColumn): DataPoint[] {
    if(col.value && Array.isArray(col.value)) {
      return col.value
    }
    return []
  }

  getDataPoint(col: ResultColumn, id?:number): DataPoint {
    const targetId = id || 0
    const points = this.getDataPoints(col)
    if(points[targetId]) {
      return points[targetId]
    }
    return this.createDataPoint()
  }

  insertColumn(key:string, atIndex:number): this {
    this.forEachRow((row: ResultRow, r:number) => {
      const leftCols = this.sliceColumns(row, 0, atIndex)
      const rightCols = this.sliceColumns(row, atIndex)
      const newCol = this.createColumn(row.key, key)
      row.cols = [
        ...leftCols,
        newCol,
        ...rightCols
      ]
    })
    return this
  }

  createColumn(rowKey: string, colKey: string): ResultColumn {
    return {
      key: colKey,
      value: [
        this.createDataPoint(rowKey, colKey)
      ]
    }
  }

  dropColumn(atIndex:number): this {
    this.forEachRow((row: ResultRow, r:number) => {
      const leftCols = this.sliceColumns(row, 0, atIndex)
      const rightCols = this.sliceColumns(row, atIndex + 1)
      row.cols = [
        ...leftCols,
        ...rightCols
      ]
    })
    return this
  }

  createDataPoint(rowKey?: string, colKey?: string, value?: ResultCell): DataPoint {
    return {
      tags: [],
      row: rowKey || 'n/a',
      column: colKey || 'n/a',
      value: value || null
    }
  }

  sliceRows(start:number, end?:number): void {
    this.result.body = this.result.body.slice(start, end)
  }

  sliceColumns(row: ResultRow, start:number, end?:number): ResultColumn[] {
    const cols = row.cols.slice(start, end)
    return cols
  }

  pushMeta(point:DataPoint, meta:any) {
    point.meta = (!point.meta) ? [] : point.meta
    point.meta.push(meta)
  }

  setPointStyle(point:DataPoint, style:any) {
    if(!point) return
    point.style = style
  }

  dump(verbose?:boolean): this {
    this.forEachRow((row: ResultRow, r:number) => {
      console.log(row.key)
      this.forEachColumn(row, (col) => {
        if(verbose === true) {
          console.log('   ' + col.key + ': ')
          console.dir(this.getDataPoint(col), {depth: 10})
        } else {
          console.log('   ' + col.key + ': ' + this.getDataPoint(col).value)
        }
      })
    })
    console.log('--------------')
    return this
  }
}
