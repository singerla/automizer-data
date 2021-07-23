import {
  RawResultData,
  DataTag,
  RawColumnSlice,
  ParserOptions,
  RawTable,
  Datasheet,
  RawRow,
  StoreSummary, ResultCell
} from "./types";
import {Store} from "./store";

import xlsx from 'node-xlsx';
const csv = require('csv-parser')
const fs = require('fs')

const v = (v: any) => {
  console.dir(v, {depth: 10})
}

export class Parser {
  results: RawResultData[];
  config: ParserOptions;
  currentSection: string;
  count: number;
  datasheets: any[];

  constructor(config: ParserOptions) {
    this.results = <RawResultData[]> []
    this.datasheets = <Datasheet[]> []
    this.config = config
    this.currentSection = ''
    this.count = -1
  }

  storeCsvFile(file: string, store: Store) {
    fs.createReadStream(file)
      .pipe(csv({ separator: ';', headers: false }))
      .on('data', (data: any) => {
        data = Object.values(data)
        this.parseSections(this.config, data)
      })
      .on('end', async () => {
        this.setDatasheets()
        await store.run(this.datasheets)
        console.log(store.summary)
      });
  }

  async storeXlsxFile(file: string, store: Store): Promise<StoreSummary> {
    const workSheetsFromBuffer = xlsx.parse(fs.readFileSync(file));
    const data = workSheetsFromBuffer[0].data
    data.forEach(row => {
      this.parseSections(this.config, <RawRow> row)
    })

    this.setDatasheets()
    await store.run(this.datasheets)

    return store.summary
  }

  parseSections(config: any, data: RawRow): void  {
    const firstCell = String(data[0]).trim()
    const secondCell = data[1]

    const hasFirstCell = (data[0] && String(data[0]).length > 0)
    const hasSecondCell = (typeof (secondCell) !== 'undefined' && String(data[1]).length > 0)

    if(firstCell.indexOf(config.separator) !== -1) {
      this.count++
      this.currentSection = 'info'
      this.results[this.count] = <RawResultData> {
        info: [],
        header: [],
        body: [],
        meta: []
      }
    }

    if(firstCell.length === 0 && !hasSecondCell
      || config.skipRows.indexOf(firstCell) > -1) {
      return;
    }

    if(hasFirstCell && !hasSecondCell) {
      this.results[this.count].info.push({
        key: this.currentSection,
        value: firstCell
      })
    }

    if(!hasFirstCell && hasSecondCell
      && this.currentSection !== 'body') {
      this.currentSection = 'header'
      this.results[this.count].header.push(data.slice(1))
    }

    if(hasFirstCell && hasSecondCell) {
      this.currentSection = 'body';
      const isMeta = this.parseMeta(data, firstCell)
      if(!isMeta) {
        this.results[this.count].body.push(data)
      }
    }
  }

  parseMeta(data: RawRow, firstCell: string): boolean {
    for(const metaKey in this.config.metaMap) {
      const isMeta = this.config.metaMap[metaKey].find(
        metaLabel => firstCell.indexOf(metaLabel) === 0
      )

      if(isMeta) {
        this.results[this.count].meta.push({
          key: metaKey,
          label: firstCell,
          data: data
        })
        return true
      }
    }
    return false
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
