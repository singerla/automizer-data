import {
  Datasheet,
  ParserOptions,
  RawResultData,
  RawRow,
} from '../types/types';

import xlsx from 'node-xlsx';
import { Parser } from './parser';
import { vd } from '../helper';

const fs = require('fs');
const path = require('path');


export class Tagged extends Parser {
  private mapCategories: any;
  private tagsMarker: string;
  private metaKey: string;
  private totalLabel: string;

  constructor(config: ParserOptions) {
    super(config);
  }

  async fromXlsx(file: string): Promise<Datasheet[]> {
    this.file = path.basename(file);

    const workSheetsFromBuffer = xlsx.parse(fs.readFileSync(file));
    workSheetsFromBuffer.forEach(workSheet => {
      this.parseWorksheet(workSheet.data);
    });

    return this.datasheets;
  }

  parseWorksheet(data) {
    console.log('File rows count: ' + String(data.length));

    this.metaKey = this.config.metaKey || 'Base';
    this.totalLabel = this.config.totalLabel || 'Total';
    this.mapCategories = this.config.mapCategories || {};
    this.tagsMarker = this.config.metaKey || '@Tags';

    const header = this.parseHeader(data);
    const allTables = this.parseData(data);
    this.results = this.sliceTables(allTables, header);

    this.setDatasheets();
  }

  parseHeaderLevels = (data) => {
    const headerLevels = {};
    const categories = [];
    const colCountRow = data.find(row => row[1] === this.metaKey);

    if (!colCountRow) {
      console.error('Could not cound cols: no metaKey: ' + this.metaKey);
      return { headerLevels, categories };
    }

    const colCount = colCountRow.length;

    let isHeader = false;
    data.forEach((row, r) => {
      if (row?.length === 0) return;
      if (row[0] && row[0].indexOf('@') === 0) {
        isHeader = true;
      } else if (row[0] && row[0].length > 0) {
        isHeader = false;
      } else if (isHeader) {
        let cat = row[1];
        categories.push(cat);
        for (let c = 2; c <= colCount; c++) {
          headerLevels[c] = headerLevels[c] || [];
          headerLevels[c].push(row[c]);
        }
      }
    });
    return { headerLevels, categories };
  };

  parseHeader = (data) => {
    const { headerLevels, categories } = this.parseHeaderLevels(data);

    const sliceAtCol = <Record<any, any>>{};
    let previousColId = 0;
    const previousValues = {};
    const headerCache = [];
    for (const colId in headerLevels) {
      headerLevels[colId].forEach((cell, level) => {
        if (cell !== undefined) {
          previousValues[level] = cell;
        }
      });

      const hasDefined = headerLevels[colId].find(cell => cell !== undefined);

      if (hasDefined) {
        const tags = [];
        categories.forEach((cat, level) => {
          tags.push({
            category: cat,
            value: previousValues[level],
          });
        });

        sliceAtCol[colId] = {
          start: Number(colId),
          end: null,
          tags: tags,
        };
        if (previousColId) {
          sliceAtCol[previousColId].end = Number(colId);
        }
        previousColId = Number(colId);
      }
    }

    const colCount = data.find(row => row[1] === this.metaKey).length;

    Object.values(sliceAtCol).forEach(header => {
      // Last slice won't have an end; using colCount.
      if (header.end === null) {
        header.end = colCount;
      }
      headerCache.push(header);
    });

    return headerCache;
  };

  parseData = (data) => {
    const allTables = [];
    let currentSection = this.totalLabel;
    let currentTopic = this.totalLabel;
    let currentVartitle = this.totalLabel;
    let currentHeader = [];

    data.forEach((row, r) => {
      const firstCell = row[0];
      const secondCell = row[1];
      const dataCell = row[2];
      const dataCellType = typeof dataCell;
      const hasData = dataCell?.length > 0
        || dataCellType === 'number';

      if (firstCell && !secondCell) {
        currentSection = firstCell;
        currentTopic = this.totalLabel;
        currentVartitle = this.totalLabel;
      }

      if (currentSection === this.tagsMarker) {
        return;
      }

      if (!firstCell && secondCell
        && dataCellType === 'string') {
        currentTopic = secondCell;
        currentHeader = row;
      }

      if (!firstCell && secondCell && !hasData) {
        currentVartitle = secondCell;
      }

      if (!firstCell && secondCell
        && dataCellType === 'number') {
        const table = this.findOrCreateTable(
          currentSection,
          currentTopic,
          currentVartitle,
          allTables,
        );

        table.header = currentHeader;

        // It is a body row with meta info
        if (secondCell === this.metaKey) {
          table.meta.push({
            key: 'base',
            label: 'Basis',
            data: row,
          });
        } else {
          // It is a numeric body row
          table.body.push(row);
        }
      }
    });
    return allTables;
  };

  sliceTables = (allTables, header) => {
    const rawResult = [];
    allTables.forEach(table => {
      header.forEach(slice => {
        const body = table.body.map(row => {
          return [row[1], ...row.slice(slice.start, slice.end)];
        });
        const meta = [];
        table.meta.forEach(tableMeta => {
          const tmpRow = [...tableMeta.data];
          meta.push({
            key: tableMeta.key,
            label: tableMeta.value,
            data: ['Meta', ...tmpRow.slice(slice.start, slice.end)],
          });
        });
        rawResult.push({
          body,
          meta,
          header: [
            table.header.slice(slice.start, slice.end),
          ],
          info: [
            {
              value: table.section,
              key: this.mapCategories.section,
            },
            {
              value: table.topic,
              key: this.mapCategories.topic,
            },
            {
              value: table.vartitle,
              key: this.mapCategories.vartitle,
            },
            ...slice.tags.map(tmp => {
              return {
                value: tmp.value,
                key: tmp.category,
              };
            }),
          ],
        });
      });
    });
    return rawResult;
  };

  findOrCreateTable = (section, topic, vartitle, allTables) => {
    const key = [section, topic, vartitle].join('|');
    const exists = allTables.find(table => table.key === key);
    if (exists) return exists;

    const table = {
      key,
      section,
      topic,
      vartitle,
      header: [],
      body: [],
      meta: [],
      info: [],
    };

    allTables.push(table);
    return table;
  };

  removeSpecialChars = (arr) => {
    arr.forEach((cell, i) => {
      if (typeof cell === 'string') {
        arr[i] = cell.replace(`\r\n`, ' ');
      }
    });
  };

  autoDetectConfig(data: any) {
    this.tableSeparator = !this.config.separator
      ? data[0][0]
      : this.config.separator;
  }

  parseSections(data: RawRow): void {
    const firstCell = String(data[0]).trim();
    const secondCell = data[1];

    const hasFirstCell = data[0] && String(data[0]).length > 0;
    const hasSecondCell =
      typeof secondCell !== 'undefined' && String(data[1]).length > 0;

    if (firstCell.indexOf(this.tableSeparator) !== -1) {
      this.count++;
      this.currentSection = 'info';
      this.results[this.count] = <RawResultData>{
        info: [
          {
            key: 'file',
            value: this.file,
          },
        ],
        header: [],
        body: [],
        meta: [],
      };
    }

    if (
      (firstCell.length === 0 && !hasSecondCell) ||
      this.config.skipRows.indexOf(firstCell) > -1
    ) {
      return;
    }

    if (this.results[this.count]) {
      if (hasFirstCell && !hasSecondCell) {
        this.results[this.count].info.push({
          key: this.currentSection,
          value: firstCell,
        });
      }

      if (hasFirstCell && this.config.firstCell === firstCell) {
        this.currentSection = 'header';
        this.results[this.count].header.push(data);
        return;
      }

      if (!hasFirstCell && hasSecondCell && this.currentSection !== 'body') {
        this.currentSection = 'header';
        this.results[this.count].header.push(data.slice(1));
      }

      if (hasFirstCell && hasSecondCell) {
        this.currentSection = 'body';
        this.results[this.count].body.push(data);
      }
    }
  }

}
