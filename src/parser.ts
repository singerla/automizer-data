import {CsvRow, RawResultData, DataTag, RawColumnSlice, ParserConfig, RawTable, Datasheet} from "./types";
import {Store} from "./store";

const csv = require('csv-parser')
const fs = require('fs')

const v = (v: any) => {
  console.dir(v, {depth: 10})
}

export class Parser {
  results: RawResultData[];
  config: ParserConfig;
  currentSection: string;
  count: number;
  datasheets: any[];

  constructor(config: ParserConfig) {
    this.results = <RawResultData[]> []
    this.datasheets = <Datasheet[]> []
    this.config = config
    this.currentSection = ''
    this.count = -1
  }

  readFile(file: string, store?: Store) {
    fs.createReadStream(file)
      .pipe(csv({ separator: ';', headers: false }))
      .on('data', (data: any) => {
        this.parseSections(this.config, data)
      })
      .on('end', async () => {
        this.setDatasheets()
        if(store) {
          await store.run(this.datasheets)
        } else {
          v(this.datasheets)
        }
      });
  }

  parseSections(config: any, data: CsvRow): void  {
    if(data[0].indexOf(config.separator) !== -1) {
      this.count++
      this.currentSection = 'info';
      this.results[this.count] = <RawResultData> {
        info: [],
        header: [],
        body: [],
        meta: {
          base: [],
          significance: []
        }
      }
    }

    let rowLabel = data[0].trim();

    if(config.skipRows.indexOf(rowLabel) > -1) {
      return;
    }

    if(rowLabel.length === 0 && data[1].length > 0) {
      this.currentSection = 'header';
    }

    if(rowLabel.length > 0 && data[1].length > 0) {
      this.currentSection = 'body';
    }

    if(this.currentSection === 'info' && rowLabel.length > 0) {
      this.results[this.count][this.currentSection].push(data[0])
    }

    if(this.currentSection === 'header') {
      this.results[this.count][this.currentSection].push(data)
    }

    if(this.currentSection === 'body'
      && rowLabel.length > 0) {
      if(rowLabel.indexOf(config.basePrefix) > -1) {
        this.results[this.count].meta.base.push(data)
        return
      }

      if(rowLabel.indexOf(config.varTitlePrefix) > -1) {
        this.results[this.count].info.push(data[0])
        return
      }

      this.results[this.count][this.currentSection].push(data)
    }
  }

  setDatasheets() {
    for(const r in this.results) {
      const table = <RawResultData> this.results[r]
      const tags = <DataTag[]> []

      this.parseTags(tags, table.info)

      const slices = this.parseColumnSlices(table.header[0])
      const subgroups = this.sliceColumns(table.body, table.header[1], slices)

      subgroups.forEach(subgroup => {
        const targetTags = this.config.renderTags([
          ...tags,
          this.pushTags('subgroup', subgroup.label)
        ])

        this.datasheets.push({
          tags: targetTags,
          columns: subgroup.columns,
          rows: subgroup.rows,
          data: subgroup.data,
          meta: []
        })
      })
    }
  }

  pushTags(category: string, value: string, tags?: DataTag[]): DataTag {
    const tag = {
      category: category,
      value: value
    }
    if(tags) {
      tags.push(tag)
    }
    return tag
  }

  parseTags(tags: DataTag[], info: string[]): void {
    const config = this.config
      info.forEach((value:string, i:number) => {
      if(i === 0) {
        this.pushTags('country', value.replace(config.separator, '').trim(), tags)
        return;
      }

      if(value.indexOf(config.variablePrefix) > -1) {
        this.pushTags('variable', config.renderVariable(value), tags)
        return;
      }

      if(value.indexOf(config.varTitlePrefix) > -1) {
        this.pushTags('vartitle', value.replace(config.varTitlePrefix, '').trim(), tags)
        return;
      }

      this.pushTags('level', value, tags)
    })
  }

  parseColumnSlices(header: CsvRow): RawColumnSlice[] {
    const slices = <any> []

    for(const c in header) {
      const cell = header[c].trim()
      if(cell.length > 0) {
        slices.push({
          label: cell,
          start: Number(c)
        })
      }
    }

    slices.forEach((slice: any, i:number) => {
      if(slices[i+1]) {
        slice.end = slices[i+1].start
      } else {
        slice.end = Object.keys(header).length
      }
      slice.length = slice.end - slice.start
    })

    return slices
  }

  sliceColumns(body: CsvRow[], subgroupHeader: CsvRow, slices: RawColumnSlice[]) {
    const subgroups = <RawTable[]> []
    slices.forEach(slice => {
      const subgroup = <RawTable> {
        label: slice.label,
        rows: [],
        columns: [],
        data: []
      }

      body.forEach(row => {
        const rowArr = Object.values(row)
        const sliced = rowArr.slice(slice.start, slice.end)
        subgroup.rows.push(rowArr[0])
        subgroup.data.push(this.config.renderRow(sliced))
      })

      const colArr = Object.values(subgroupHeader)
      subgroup.columns = colArr.slice(slice.start, slice.end)

      subgroups.push(subgroup)
    })
    return subgroups
  }
}
