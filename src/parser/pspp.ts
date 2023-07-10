import { Datasheet, ParserOptions } from "../types/types";
import { Parser } from "./parser";

const crypto = require("crypto");
const fs = require("fs");
const CSV = require("csv-string");

export class PSPP extends Parser {
  constructor(config: ParserOptions) {
    super(config);
  }

  async fromSav(file: string): Promise<Datasheet[]> {
    const psppBin = "/usr/bin/pspp";

    const spsSyntax = [`GET FILE="${file}".`];

    this.config.spsCommands.forEach((sps) => {
      let syntax = "";
      switch (sps.command) {
        case "CROSSTABS":
          syntax = `CROSSTABS
            /TABLES= ${sps.varDep} BY  ${sps.varIndep}
            /FORMAT=TABLES NOPIVOT
            /CELLS=COUNT COLUMN.
          `;
          break;
        default:
          break;
      }
      spsSyntax.push(syntax);
    });

    const tmpDir = this.config.spsTmpDir + "/";

    const tmpFilename = tmpDir + crypto.randomUUID() + ".sps";
    fs.writeFileSync(tmpFilename, spsSyntax.join("\n"));

    const execPspp = `${psppBin} ${tmpFilename} -O format=csv`;

    const { execSync } = require("child_process");

    const psppOutput = execSync(execPspp, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
    }).toString();

    const parsedCsv = CSV.parse(psppOutput, ",");

    const skip = ["Table: Zusammenfassung"];
    const valueKey = "Spalte %";
    const tableKey = "Table: ";
    const totalKey = "Gesamt";
    const totalLabel = "TOTAL";

    let currentTable;
    let currentTableIndex = 0;
    const datasheets = <Datasheet[]>[];
    parsedCsv.forEach((row, r) => {
      if (!skip.includes(row[0]) && row[0].indexOf(tableKey) === 0) {
        currentTable = {
          index: currentTableIndex,
          meta: [],
          data: [],
          rows: [],
          columns: [],
          mapColumns: [],
          tags: [
            {
              category: "quId",
              value: this.config.spsCommands[currentTableIndex].varDep,
            },
            {
              category: "subgroup",
              value: this.config.spsCommands[currentTableIndex].varIndep,
            },
            {
              category: "questionId",
              value: parsedCsv[r + 3][0],
            },
          ],
          count: 1,
        };
        datasheets.push(currentTable);
        currentTableIndex++;
      }

      if (currentTable?.count) {
        if (currentTable.count === 3) {
          currentTable.columns.push(totalLabel);
          currentTable.mapColumns.push({
            colId: row.length - 1,
            column: totalLabel,
          });

          row.forEach((cell, c) => {
            if (cell.length === 0) return;
            currentTable.columns.push(cell);
            currentTable.mapColumns.push({
              colId: c,
              column: cell,
            });
          });
        }

        if (currentTable.count >= 4 && row[2] === valueKey) {
          if (parsedCsv[r - 1][1].length) {
            const rowLabel = parsedCsv[r - 1][1];
            currentTable.rows.push(rowLabel);

            const dataRow = [];
            currentTable.mapColumns.forEach((mapColumn) => {
              dataRow.push(PSPP.floatify(row[mapColumn.colId]));
            });
            currentTable.data.push(dataRow);
          }
        }

        if (row[0] === totalKey) {
          const metaRow = [];
          currentTable.mapColumns.forEach((mapColumn) => {
            metaRow.push(PSPP.floatify(row[mapColumn.colId]));
          });
          currentTable.meta.push({
            key: "base",
            value: "Base",
            data: metaRow,
          });
        }

        currentTable.count++;
      }

      if (currentTable?.count > 0 && row.length === 0 && row[0] === "") {
        currentTable = {};
      }
    });

    fs.unlinkSync(tmpFilename);

    return datasheets;
  }

  static floatify(str: string): number {
    const num = str.replace(",", ".").replace("%", "");
    return Number(num);
  }
}
