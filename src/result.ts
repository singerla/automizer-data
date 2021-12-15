import {CellKeys, Datasheet, QueryResultKeys, Result as ResultType, ResultCell, ResultColumn} from './types';
import {ChartData} from 'pptx-automizer/dist';
import {ChartCategory} from 'pptx-automizer/dist/types/chart-types';
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
  metaParams: any

  constructor(query: Query) {
    this.result = query.result
    this.inputKeys = query.inputKeys
    this.keys = query.keys
    this.visibleKeys = query.visibleKeys
    this.allSheets = query.allSheets
    this.tags = <any>[]
    this.metaParams = <any> undefined
  }

  setTableMetaParams(params:any) {
    this.metaParams = params
  }

  toSeriesCategories(): ChartData {
    if(this.result.body[0]) {
      const series = this.result.body[0].cols.map(col => { return { label: col.key } } )
      const categories = <ChartCategory[]> []

      this.result.body.forEach(row => {
        categories.push({
          label: row.key,
          values: row.cols.map(column => this.toNumber(column))
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
      const tableRowStyle = <TableRowStyle[]>[]
      if(params?.showRowLabels) {
        tableRow.push(String(row.key))
      }
      row.cols.forEach((cell,c) => {
        tableRow.push(this.renderCellValue(cell))
        if(this.metaParams) {
          tableRowStyle.push(this.renderRowStyle(cell))
        }
      })
      body.push({
        values: tableRow,
        styles: tableRowStyle
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

  renderRowStyle(column: ResultColumn): TableRowStyle {
    const style = <TableRowStyle>{}
    if(Array.isArray(column.value)
      && column.value[0]
      && column.value[0].meta) {

      column.value[0].meta.forEach(meta => {
        const hasMetaParams = this.metaParams.find((metaParams:any) => meta.key === metaParams.key)
        if(hasMetaParams) {
          Object.assign(style, hasMetaParams.style)
        }
      })
    }
    return style
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
