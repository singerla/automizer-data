import {
  RawResultData,
  DataTag,
  RawColumnSlice,
  ParserOptions,
  RawTable,
  Datasheet,
  RawRow,
  StoreSummary, ResultCell
} from "./../types";
import {Store} from "./../store";

import xlsx from 'node-xlsx';
import {Parser} from "./parser";

const csv = require('csv-parser')
const fs = require('fs')


export class Gesstabs extends Parser {
  constructor(config: ParserOptions) {
    super(config)
  }

  async fromCsv(file: string): Promise<Datasheet[]>  {
    return new Promise((resolve, reject) => {
      fs.createReadStream(file)
        .pipe(csv({separator: ';', headers: false}))
        .on('data', (data: any) => {
          data = Object.values(data)
          this.parseSections(data)
        })
        .on('end', () => {
          this.setDatasheets()
          resolve(this.datasheets);
        });
    })
  }

  async fromXlsx(file: string): Promise<Datasheet[]> {
    const workSheetsFromBuffer = xlsx.parse(fs.readFileSync(file));
    const data = workSheetsFromBuffer[0].data
    console.log('File rows count: ' + String(data.length))
    this.autoDetectConfig(data)
    console.log('Table separator: ' + this.tableSeparator)
    data.forEach(row => {
      this.parseSections(<RawRow> row)
    })
    this.setDatasheets()
    return this.datasheets
  }

  autoDetectConfig(data: any) {
    this.tableSeparator = (!this.config.separator)
      ? this.config.separator = data[0][0]
      : this.config.separator
  }

  parseSections(data: RawRow): void  {
    const firstCell = String(data[0]).trim()
    const secondCell = data[1]

    const hasFirstCell = (data[0] && String(data[0]).length > 0)
    const hasSecondCell = (typeof (secondCell) !== 'undefined' && String(data[1]).length > 0)

    if(firstCell.indexOf(this.tableSeparator) !== -1) {
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
      || this.config.skipRows.indexOf(firstCell) > -1) {
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
}
