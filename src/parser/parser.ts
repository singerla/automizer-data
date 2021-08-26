import {
  RawResultData,
  DataTag,
  RawColumnSlice,
  ParserOptions,
  RawTable,
  Datasheet,
  RawRow,
  StoreSummary, ResultCell
} from "../types";
import {Store} from "../store";

import xlsx from 'node-xlsx';
const csv = require('csv-parser')
const fs = require('fs')

export class Parser {
  results: RawResultData[];
  config: ParserOptions;
  currentSection: string;
  count: number;
  datasheets: Datasheet[];

  constructor(config: ParserOptions) {
    this.results = <RawResultData[]> []
    this.datasheets = <Datasheet[]> []
    this.config = config
    this.currentSection = ''
    this.count = -1
  }

  setDatasheets() {
    for(const r in this.results) {
      const table = <RawResultData> this.results[r]

      const tagsObj = {
        tags: <DataTag[]> [],
        push(cat: string, value: string) {
          this.tags.push({
            category: cat,
            value: value
          })
        }
      }

      this.config.renderTags(table.info, tagsObj)
      const tags = tagsObj.tags
      const slices = this.parseColumnSlices(table.header)
      const subgroups = this.sliceColumns(table, table.header, slices)

      subgroups.forEach(subgroup => {
        const targetTags = [
          ...tags,
          this.getTag('subgroup', subgroup.label)
        ]

        this.datasheets.push({
          tags: targetTags,
          columns: subgroup.columns,
          rows: subgroup.rows,
          data: subgroup.data,
          meta: subgroup.meta
        })
      })
    }
  }

  getTag(category: string, value: string): DataTag {
    const tag = {
      category: category,
      value: value
    }
    return tag
  }

  parseColumnSlices(header: RawRow[]): RawColumnSlice[] {
    const slices = <any> []
    const countHeaderLevels = header.length
    const bottomLevel = countHeaderLevels - 1
    const lastValues = <any> {}
    const sliceKeys = <any> {}

    header[bottomLevel].forEach((value: ResultCell, colId: number) => {
      const upperValues = []
      for(let level = 0; level < bottomLevel; level++) {
        if(typeof(header[level][colId]) !== 'undefined'
          && String(header[level][colId]).trim().length > 0) {
          const upperValue = String(header[level][colId])
          upperValues.push(upperValue)
          lastValues[level] = upperValue
        } else if(lastValues[level]) {
          upperValues.push(lastValues[level])
        } else {
          upperValues.push(value)
        }
      }

      const uniqueUpperValues = [...new Set(upperValues)]
      const sliceKey = uniqueUpperValues.join('|')
      if(!sliceKeys[sliceKey]) {
        sliceKeys[sliceKey] = <any> []
      }

      sliceKeys[sliceKey].push(colId)
    })

    for(const sliceKey in sliceKeys) {
      slices.push({
        label: sliceKey,
        start: sliceKeys[sliceKey][0],
        end: sliceKeys[sliceKey][0] + sliceKeys[sliceKey].length
      })
    }

    return slices
  }

  sliceColumns(table: RawResultData, subgroupHeaders: RawRow[], slices: RawColumnSlice[]) {
    const bottomLevel = subgroupHeaders.length - 1
    const subgroupHeader = subgroupHeaders[bottomLevel]
    const body = table.body
    const meta = table.meta

    const subgroups = <RawTable[]> []
    slices.forEach(slice => {
      const subgroup = <RawTable> {
        label: slice.label,
        rows: [],
        columns: [],
        data: [],
        meta: [],
      }

      body.forEach(row => {
        const rowArr = Object.values(row)
        const rowLabel = String(rowArr[0])
        const sliced = rowArr.slice(slice.start + 1, slice.end + 1)
        subgroup.rows.push(rowLabel)
        subgroup.data.push(this.config.renderRow(sliced))
      })

      meta.forEach(meta => {
        subgroup.meta.push({
          key: meta.key,
          label: meta.label,
          data: meta.data.slice(slice.start + 1, slice.end + 1)
        })
      })

      const colArr = Object.values(subgroupHeader)
      subgroup.columns = colArr.slice(slice.start, slice.end).map(col => String(col))

      subgroups.push(subgroup)
    })
    return subgroups
  }
}