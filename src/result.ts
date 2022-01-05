import {
  CellKeys,
  Datasheet,
  MetaParam,
  QueryResultKeys,
  Result as ResultType,
  ResultCell,
  ResultColumn,
  ResultRow
} from './types';
import {ChartData} from 'pptx-automizer/dist';
import {ChartCategory, ChartValueStyle} from 'pptx-automizer/dist/types/chart-types';
import {TableData, TableRow, TableRowStyle} from 'pptx-automizer/dist/types/table-types';
import Query from './query';
import { vd } from './helper';

export default class Result {
  result: ResultType
  inputKeys: CellKeys
  keys: CellKeys
  visibleKeys: {
    row: string[],
    column: string[]
  }
  allSheets: Datasheet[]
  tags: any[]
  metaParams: MetaParam

  constructor(query: Query) {
    this.result = query.result
    this.inputKeys = query.inputKeys
    this.keys = query.keys
    this.visibleKeys = query.visibleKeys
    this.allSheets = query.allSheets
    this.tags = <any>[]
    this.metaParams = <MetaParam> {}
  }

  setMetaParams(params:any) {
    this.metaParams = params
  }

  applyStyleCallback<T>(row: ResultRow): T[] | TableRowStyle[] | ChartValueStyle[] {
    const styles = (this.metaParams?.cb)
      ? this.metaParams.cb(row, this.metaParams, this) : []
    return styles
  }

  toSeriesCategories(): ChartData {
    if(this.result.body[0]) {
      const series = this.result.body[0].cols.map(col => { return { label: col.key } } )
      const categories = <ChartCategory[]> []

      this.result.body.forEach(row => {
        categories.push({
          label: row.key,
          values: row.cols.map(column => this.toNumber(column)),
          styles: this.applyStyleCallback<ChartValueStyle>(row)
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
        values: row.cols.map(cell => this.toNumber(cell))
      })
    })

    return {
      series: series,
      categories: categories
    }
  }

  toScatter(): ChartData {
    const series = [
      {label: 'Series 1'}
    ]
    const categories = <ChartCategory[]> []

    this.result.body.forEach((row:any, r) => {
      categories.push({
        label: row.key,
        y: row.cols[0].value[0].value,
        values: [row.cols[1].value[0].value]
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
    let series = <string[]>[]
    if(this.result.body && this.result.body.length) {
      series = this.result.body[0].cols.map(col => col.key)
    }

    return {
      body: [
        {
          values: series
        }
      ]
    }
  }

  toTableBody(): TableData {
    return {
      body: this.result.body.map(row => {
        return {
          values: row.cols.map(cell => this.toNumber(cell) )
        }
      }),
    }
  }

  toTable(params?:any): TableData {
    const body = <TableRow[]>[]

    if(!this.result.body[0]) {
      return {
        body: [
          {
            values: []
          }
        ]
      }
    }

    if(params?.showColumnLabels) {
      body.push({
        values: [
          '',
          ...this.result.body[0].cols.map(col => col.key)
        ]
      })
    }

    this.result.body.forEach((row,r) => {
      const tableRow = []
      if(params?.showRowLabels) {
        tableRow.push(String(row.key))
      }
      row.cols.forEach((cell,c) => {
        tableRow.push(this.renderCellValue(cell))
      })

      body.push({
        values: tableRow,
        styles: this.applyStyleCallback<TableRowStyle>(row)
      })
    })
    return {
      body: body
    }
  }

  toNumber(column: ResultColumn): number {
    const value = this.renderCellValue(column)
    return Number(value)
  }

  renderCellValue(column: ResultColumn): ResultCell {
    if(Array.isArray(column.value)) {
      if(column.value.length > 0) {
        return column.value[0].value
      }
    }

    if(typeof column.value === 'number'
      || typeof column.value === 'string') {
      return column.value
    }

    return null
  }

  formatPointKeys(keys:any) {
    const rowOrColumn = ['row', 'column', 'nested']

    const queryResultKeys = <QueryResultKeys> {
      row: (keys.row) ? Object.keys(keys.row): [],
      column: (keys.column) ? Object.keys(keys.column): [],
      nested: (keys.nested) ? Object.keys(keys.nested): [],
      category: []
    }

    for(const key in keys) {
      if(!rowOrColumn.includes(key)) {
        queryResultKeys.category.push({
          categoryId: Number(key),
          keys: Object.keys(keys[key])
        })
      }
    }

    return queryResultKeys
  }
}
