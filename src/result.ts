import {
  CellKeys,
  DataPoint,
  Datasheet,
  MetaParam,
  QueryResultKeys,
  Result as ResultType,
  ResultCell,
  ResultColumn,
  ResultRow
} from './types';
import {ChartData} from 'pptx-automizer/dist';
import {ChartBubble, ChartCategory, ChartSeries, ChartValueStyle} from 'pptx-automizer/dist/types/chart-types';
import {TableData, TableRow, TableRowStyle} from 'pptx-automizer/dist/types/table-types';
import Query from './query';
import {vd} from './helper';
import {TextStyle} from 'pptx-automizer/dist/types/modify-types';

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

  getSeries = (): ChartSeries[] => {
    return this.result.body[0].cols.map(col => {
      return {
        label: col.key,
        style: col.style
      }
    })
  }

  toSeriesCategories(): ChartData {
    if(this.result.body[0]) {
      const series = this.getSeries()
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
    const series = this.getSeries()
    const categories = <ChartCategory[]> []

    this.result.body.forEach((row, r) => {
      categories.push({
        label: row.key,
        y: r,
        values: row.cols.map(cell => this.toNumber(cell)),
      })
    })

    return {
      series: series,
      categories: categories
    }
  }

  toCombo(): ChartData {
    const series = this.getSeries()
    const categories = <ChartCategory[]> []

    this.result.body.forEach((row, r) => {
      categories.push({
        label: row.key,
        y: r + 0.5,
        values: row.cols.map(cell => this.toNumber(cell)),
        styles: this.parseValueStyle(row.cols)
      })
    })

    return {
      series: series,
      categories: categories
    }
  }

  toScatter(): ChartData {
    const series = this.getSeries()
    const categories = <ChartCategory[]> []

    this.result.body.forEach((row:any, r) => {
      categories.push({
        label: row.key,
        values: row.cols.map((col:any) => {
          return {
            x: Number(col.value[0].value),
            y: Number(col.value[1].value)
          }
        }),
        styles: this.applyStyleCallback<ChartValueStyle>(row)
      })
    })

    return {
      series: series,
      categories: categories
    }
  }

  toBubbles(): ChartData {
    const series = this.getSeries()
    const categories = <ChartCategory[]> []

    this.result.body.forEach((row:any, r) => {
      categories.push({
        label: row.key,
        values: row.cols.map((col:any) => {
          return <ChartBubble> {
            size: Number(col.value[0].value),
            x: Number(col.value[1].value),
            y: Number(col.value[2].value),
          }
        }),
        styles: this.applyStyleCallback<ChartValueStyle>(row)
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
          values: [ row.key ],
          styles: this.applyStyleCallback<TableRowStyle>(row)
        }
      })
    }
  }

  toRowLabels(): TableData {
    return this.toLabels()
  }

  toColumnLabels(): TableData {
    let series = <string[]>[]
    let styles = <any>[]
    if(this.result.body && this.result.body.length) {
      series = this.result.body[0].cols.map(col => col.key)
      styles = this.applyStyleCallback<TableRowStyle>(this.result.body[0])
    }

    return {
      body: [
        {
          values: series,
          styles: styles
        }
      ]
    }
  }

  toTableBody(): TableData {
    return {
      body: this.result.body.map(row => {
        return {
          values: row.cols.map(cell => this.toNumber(cell))
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
      const header = []
      if(params?.showRowLabels) {
        header.push('')
      }
      header.push(...this.result.body[0].cols.map(col => col.key))

      body.push({
        values: header
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

  toNumber(column: ResultColumn): any {
    const value = this.renderCellValue(column)
    if(value === '') return value
    return Number(value)
  }

  renderCellValue(column: ResultColumn): ResultCell {
    if(!column) return ''

    if(Array.isArray(column.value)) {
      if(!column.value[0] || column.value[0].value === null) {
        return ''
      }

      if(column.value.length > 0) {
        return column.value[0].value
      }
    }

    if(typeof column.value === 'number'
      || typeof column.value === 'string') {
      return column.value
    }

    return ''
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

  applyStyleCallback<T>(row: ResultRow): T[] | TextStyle[] | ChartValueStyle[] {
    if(this.metaParams?.cb) {
      return this.metaParams.cb(row, this.metaParams, this)
    }

    const styles = <any[]>[]
    row.cols.forEach((column: ResultColumn) => {
      if(column.value && Array.isArray(column.value)) {
        column.value.forEach(point => {
          if(point.style) {
            styles.push(point.style)
          } else {
            styles.push(null)
          }
        })
      }
    })

    return styles
  }

  parseValueStyle(cols: ResultColumn[]) {
    return cols.map(cell => {
      if(Array.isArray(cell.value)
        && cell.value[0]
        && cell.value[0].style) {
        return cell.value[0].style
      }
      return null
    })
  }

}
