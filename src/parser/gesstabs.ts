import {
  RawResultData,
  DataTag,
  RawColumnSlice,
  ParserOptions,
  RawTable,
  Datasheet,
  RawRow,
  StoreSummary, ResultCell, RawResultMeta, RawResultNestedItem, RawResultNestedParent, RawResultInfo,
} from './../types';
import {Store} from "./../store";

import xlsx from 'node-xlsx';
import {Parser} from "./parser";
import { vd } from '../helper';

const csv = require('csv-parser')
const fs = require('fs')
const path = require('path')

export class Gesstabs extends Parser {
  constructor(config: ParserOptions) {
    super(config)
  }

  async fromCsv(file: string): Promise<Datasheet[]>  {
    this.file = path.basename(file)
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
    this.file = path.basename(file)
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
    if(!this.config.separator) {
      const tableSeparatorRow = data.find((row:any) =>
        row[0]
        && typeof row[0] === 'string'
        && row[0].trim().length > 0
      )
      this.tableSeparator = tableSeparatorRow[0]
    } else {
      this.tableSeparator = this.config.separator
    }
  }

  parseSections(data: RawRow): void  {
    const firstCell = String(data[0]).trim()
    const secondCell = data[1]

    const hasFirstCell = (data[0] && String(data[0]).length > 0)
    const hasSecondCell = (typeof (secondCell) !== 'undefined' && String(data[1]).length > 0)

    if(firstCell.indexOf(this.tableSeparator) !== -1) {
      this.count++
      this.currentSection = 'info'
      this.results[this.count] = <RawResultData>  {
        info: [{
          key: 'file',
          value: this.file
        }],
        header: [],
        body: [],
        meta: [],
        nested: [],
      }

      this.nested = <RawResultNestedParent[]>[]
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
        this.parseNested(data, firstCell)
        this.results[this.count].nested?.push({
          parents: this.nested,
          label: firstCell
        })
      }
    }
  }

  parseMeta(data: RawRow, firstCell: string): boolean {
    for(const metaKey in this.config.metaMap) {
      const isMeta = this.config.metaMap[metaKey].find(
        metaLabel => firstCell.indexOf(metaLabel) === 0
      )

      if(isMeta) {
        this.results[this.count].meta.push(<RawResultMeta> {
          key: metaKey,
          label: firstCell,
          data: data
        })
        return true
      }
    }
    return false
  }

  parseNested(data: RawRow, firstCell: string): boolean {
    if(!this.config.overcodes) return false

    for(const overcodeLevel in this.config.overcodes) {
      const overcode = this.config.overcodes[overcodeLevel]
      const isOvercode = (firstCell.indexOf(overcode.prefix) === 0)

      if(isOvercode) {
        this.nested = this.nested.filter(nested => nested.level < Number(overcodeLevel))
        const parent = {
          level: Number(overcodeLevel),
          label: firstCell,
          key: overcode.key,
        }
        this.nested.push(parent)
        return true
      }
    }

    return false
  }

  parseSigniHeader = (cells: string[], meta: RawResultMeta[]) => {
    if(!this.config.significance) return cells

    const headerSeparator = this.config.significance.headerSeparator || '$'

    const signiMeta = <RawResultMeta> {
      key: this.config.significance.lettersKey,
      label: this.config.significance.lettersKey,
      info: [],
    }

    cells.forEach((cell, c) => {
      const split = cell.split(headerSeparator)
      if(split[1]) {
        signiMeta.info?.push({
          key: split[0],
          value: split[1]
        })
        cells[c] = split[0]
      }
    })

    if(signiMeta.info?.length) {
      meta.push(signiMeta)
    }
  }

  parseSigniValues = (
    cell: string,
    colId: number,
    rowLabel: string,
    meta: RawResultMeta[],
    signiHeaderLetters: RawResultInfo[]): string => {
    if(!this.config.significance) return cell

    const signiCellSeparator = this.config.significance.cellSeparator
    const split = cell.split(signiCellSeparator)

    if (split[1]) {
      const signiMap = this.getSigniMap(split[1], signiHeaderLetters, colId)
      if(signiMap.length) {
        const valueKey = this.config.significance.valueKey
        this.pushMeta(rowLabel, valueKey, signiMap, meta)
      }
      cell = split[0]
    }

    return cell
  }

  getSigniMap = (signiCellInfo:string, signiHeaderLetters:RawResultInfo[], colId: number): RawResultInfo[] => {
    const signiHeaderFilter = this.config.significance?.headerFilter || []
    const signiLetters = signiCellInfo.split('')
    const signiMap = <RawResultInfo[]>[]
    signiLetters.forEach((signiLetter: string) => {
      const thisHeader = signiHeaderLetters.find(singiHeaderLetter => singiHeaderLetter.value === signiLetter)
      const thisKey = signiHeaderLetters[colId].key
      const vsKey = thisHeader?.key
      if(vsKey && (signiHeaderFilter.includes(vsKey) || signiHeaderFilter.includes(thisKey))) {
        this.pushSigniMap(signiMap, thisKey, 'higherThan', vsKey)
        this.pushSigniMap(signiMap, vsKey, 'lowerThan', thisKey)
      }
    })
    return signiMap
  }

  pushSigniMap(signiMap:RawResultInfo[], value:string, info:string, key:string): void {
    signiMap.push({
      value: value,
      info: info,
      key: key,
    })
  }
}
