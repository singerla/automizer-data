import {
  Datasheet,
  ParserOptions,
  RawResultData,
  RawRow,
} from "../types/types";

import xlsx from "node-xlsx";
import { Parser } from "./parser";

const fs = require("fs");
const path = require("path");

export class Generic extends Parser {
  constructor(config: ParserOptions) {
    super(config);
  }

  async fromXlsx(file: string): Promise<Datasheet[]> {
    this.file = path.basename(file);

    const worksheetId = this.config.worksheetId || 0;
    const workSheetsFromBuffer = xlsx.parse(fs.readFileSync(file));
    const data = workSheetsFromBuffer[worksheetId].data;
    console.log("File rows count: " + String(data.length));
    this.autoDetectConfig(data);
    console.log("Table separator: " + this.tableSeparator);
    data.forEach((row) => {
      this.parseSections(<RawRow>row);
    });
    this.setDatasheets();
    return this.datasheets;
  }

  async fromCustomXlsx(file: string): Promise<Datasheet[]> {
    this.file = path.basename(file);

    const worksheetId = this.config.worksheetId || 0;
    const workSheetsFromBuffer = xlsx.parse(fs.readFileSync(file));
    const data = workSheetsFromBuffer[worksheetId].data;
    console.log("File rows count: " + String(data.length));

    this.results = this.config.customXlsx(data, this.file);
    this.setDatasheets();

    return this.datasheets;
  }

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
      typeof secondCell !== "undefined" && String(data[1]).length > 0;

    if (firstCell.indexOf(this.tableSeparator) !== -1) {
      this.count++;
      this.currentSection = "info";
      this.results[this.count] = <RawResultData>{
        info: [
          {
            key: "file",
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
        this.currentSection = "header";
        this.results[this.count].header.push(data);
        return;
      }

      if (!hasFirstCell && hasSecondCell && this.currentSection !== "body") {
        this.currentSection = "header";
        this.results[this.count].header.push(data.slice(1));
      }

      if (hasFirstCell && hasSecondCell) {
        this.currentSection = "body";
        this.results[this.count].body.push(data);
      }
    }
  }

  // Add some randomness to imported values
  static shuffleRow = (row: number[], r: number) => {
    row.forEach((cell: number, c: number) => {
      if (c > 0) {
        cell = Number(cell);
        let x = Math.floor((Math.random() * cell) / 3.5 + 1);
        if (r % 2 === 0) {
          row[c] = cell + x;
        } else {
          row[c] = cell - x;
        }
        if (row[c] <= 0) {
          row[c] = Math.abs(row[c]);
        }
        row[c] = Math.round(row[c] * 10) / 10;
      }
    });
    return row;
  };
}
