import {
  Datasheet,
  DataTag,
  ParserOptions,
  ParserOptionsPsppCommands,
  ParserOptionsPsppFilters,
  ParserOptionsPsppKeys,
  ParserOptionsPsppLabels,
  RawRow,
} from "../types/types";
import { Parser } from "./parser";
import { vd } from "../helper";
const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const CSV = require("csv-string");

type PsppItem = {
  index: number;
  commandName: string;
  rowVar: string;
  columnVar: string;
  filters: ParserOptionsPsppFilters[];
  syntax: string;
};

type PsppStack = {
  items: PsppItem[];
  byIndex: (i: number) => PsppItem;
};

type PsppDatasheet = Datasheet & {
  count: number;
  mapColumns: number[];
  index: number;
};

export class Pspp extends Parser {
  constructor(config: ParserOptions) {
    super(config);
  }

  async fromSav(file: string): Promise<PsppDatasheet[]> {
    const filters = this.config.pspp.filters || [];
    const labels = this.config.pspp.labels || [];
    const commands = this.config.pspp.commands || [];
    const addTags = this.config.pspp.addTags || [];

    const spsStack = this.getSpsStack(commands, filters);
    const tmpFilename = this.writeTmpSpsFile(file, spsStack);
    const psppOutput = this.callPspp(this.config.pspp.binary, tmpFilename);
    const parsedCsv = CSV.parse(psppOutput, ",");

    const psppLanguage = this.config.pspp.psppLanguage || "en";
    const keys = Pspp.getKeys(psppLanguage);

    if (this.config.pspp.keys) {
      Object.assign(keys, this.config.pspp.keys);
    }

    const datasheets = this.getDatasheets(parsedCsv, keys, spsStack, addTags);

    this.renameLabels(datasheets, labels);

    fs.unlinkSync(tmpFilename);

    return datasheets;
  }

  getDatasheets(
    parsedCsv: string[][],
    keys: ParserOptionsPsppKeys,
    spsStack: PsppStack,
    addTags: DataTag[]
  ): PsppDatasheet[] {
    let currentDatasheet;
    let currentIndex = 0;
    const datasheets = <PsppDatasheet[]>[];
    parsedCsv.forEach((row, r) => {
      if (
        !keys.skipKeys.includes(row[0]) &&
        row[0].indexOf(keys.tableKey) === 0
      ) {
        const questionText = parsedCsv[r + 3][0];
        const currentStackItem = spsStack.byIndex(currentIndex);
        currentDatasheet = this.getDefaultDatatable(
          currentIndex,
          questionText,
          currentStackItem,
          addTags
        );
        datasheets.push(currentDatasheet);
        currentIndex++;
      }

      if (currentDatasheet?.count) {
        if (currentDatasheet.count === 3) {
          this.setColumns(currentDatasheet, row, keys.totalLabel);
        }

        if (currentDatasheet.count >= 4 && row[2] === keys.valueKey) {
          this.setSheetData(parsedCsv, r, currentDatasheet);
        }

        if (row[0] === keys.totalKey) {
          this.setMeta(currentDatasheet, row);
        }
        currentDatasheet.count++;
      }

      if (currentDatasheet?.count > 0 && row.length === 0 && row[0] === "") {
        currentDatasheet = {};
      }
    });
    return datasheets;
  }

  setMeta(currentDatasheet: PsppDatasheet, row: string[]) {
    const metaRow = [];
    currentDatasheet.mapColumns.forEach((mapColumn) => {
      metaRow.push(Pspp.floatify(row[mapColumn]));
    });
    currentDatasheet.meta.push({
      key: "base",
      label: "Base",
      data: metaRow,
    });
  }

  setColumns(
    currentDatasheet: PsppDatasheet,
    row: string[],
    totalLabel: string
  ) {
    currentDatasheet.columns.push(totalLabel);
    currentDatasheet.mapColumns.push(row.length - 1);

    row.forEach((cell, c) => {
      if (cell.length === 0) return;
      currentDatasheet.columns.push(cell);
      currentDatasheet.mapColumns.push(c);
    });
  }

  setSheetData(
    parsedCsv: string[][],
    r: number,
    currentDatasheet: PsppDatasheet
  ) {
    const currentRow = parsedCsv[r];
    const previousRow = parsedCsv[r - 1];
    if (previousRow[1].length) {
      const rowLabel = previousRow[1];
      currentDatasheet.rows.push(rowLabel);

      const dataRow = [];
      currentDatasheet.mapColumns.forEach((mapColumn) => {
        dataRow.push(Pspp.floatify(currentRow[mapColumn]));
      });
      currentDatasheet.data.push(dataRow);
    }
  }

  getDefaultDatatable(
    currentTableIndex: number,
    questionText: string,
    currentStackItem: PsppItem,
    addTags: DataTag[]
  ): PsppDatasheet {
    const currentDatasheet = <PsppDatasheet>{
      index: currentTableIndex,
      mapColumns: [],
      count: 1,
      meta: [],
      data: [],
      rows: [],
      columns: [],
      tags: [],
    };
    currentDatasheet.tags = [
      ...addTags,
      {
        category: "questionNumber",
        value: currentStackItem.rowVar,
      },
      {
        category: "subgroup",
        value: currentStackItem.columnVar,
      },
      {
        category: "questionText",
        value: questionText,
      },
    ];

    currentStackItem.filters.forEach((filter) => {
      currentDatasheet.tags.push({
        category: filter.category,
        value: filter.value,
      });
    });

    return currentDatasheet;
  }

  getSpsStack(
    commands: ParserOptionsPsppCommands[],
    filters: ParserOptionsPsppFilters[]
  ): PsppStack {
    const spsStack: PsppStack = {
      byIndex: (i: number): PsppItem => {
        return spsStack.items.find((item) => item.index === i);
      },
      items: <PsppItem[]>[],
    };

    let count = 0;
    commands.forEach((command) => {
      const name = command.name ? command.name : "CROSSTABS";

      let syntaxSelectIf = "";
      let targetFilters: ParserOptionsPsppFilters[] = [];
      if (command.filters) {
        targetFilters = filters.filter((filter) =>
          command.filters.includes(filter.key)
        );
        const selectIf = targetFilters
          .map((filter) => filter.selectIf)
          .join(" AND ");
        syntaxSelectIf += `TEMPORARY. 
          SELECT IF ${selectIf}.
        `;
      }

      command.columnVars.forEach((columnVar) => {
        const syntax = [syntaxSelectIf];

        syntax.push(
          this.getSpsCommand(name, {
            rowVar: command.rowVar,
            columnVar: columnVar,
          })
        );

        spsStack.items.push({
          index: count,
          commandName: name,
          rowVar: command.rowVar,
          columnVar: columnVar,
          syntax: syntax.join(""),
          filters: targetFilters,
        });
        count++;
      });
    });

    return spsStack;
  }

  getSpsCommand(name, args) {
    switch (name) {
      case "CROSSTABS":
        return `CROSSTABS
              /TABLES=${args.rowVar} BY ${args.columnVar}
              /FORMAT=TABLES NOPIVOT
              /CELLS=COUNT COLUMN.
          `;
      default:
        break;
    }
  }

  renameLabels(datasheets: PsppDatasheet[], labels: ParserOptionsPsppLabels[]) {
    labels.forEach((label) => {
      if (label.section === "rows" || label.section === "columns") {
        this.replaceLabelsBySection(datasheets, label.section, label);
      } else {
        this.replaceLabelsByTag(datasheets, label);
      }
    });
  }

  replaceLabelsBySection(
    datasheets: PsppDatasheet[],
    section: "rows" | "columns",
    label: ParserOptionsPsppLabels
  ) {
    datasheets.forEach((datasheet) => {
      datasheet[section].forEach((row, r) => {
        if (label.replace === row) {
          datasheet[section][r] = label.by;
        }
      });
    });
  }

  replaceLabelsByTag(
    datasheets: PsppDatasheet[],
    label: ParserOptionsPsppLabels
  ) {
    datasheets.forEach((datasheet) => {
      const targetTag = datasheet.tags.find(
        (tag) => tag.category === label.section && tag.value === label.replace
      );
      if (targetTag) {
        targetTag.value = label.by;
      }
    });
  }

  writeTmpSpsFile(file: string, spsStack: PsppStack): string {
    const spsSyntax = [`GET FILE="${file}".`];
    spsStack.items.forEach((spsItem) => {
      spsSyntax.push(spsItem.syntax);
    });

    const tmpDir = this.config.tmpDir + "/";
    const tmpFilename = tmpDir + crypto.randomUUID() + ".sps";
    fs.writeFileSync(tmpFilename, spsSyntax.join("\n"));

    return tmpFilename;
  }

  callPspp(psppBin: string, tmpFilename: string) {
    const execPspp = `${psppBin} ${tmpFilename} -O format=csv`;
    let psppOutput;
    try {
      psppOutput = execSync(execPspp).toString();
    } catch (e) {
      console.error(e);
    }
    return psppOutput;
  }

  static floatify(str: string): number {
    const num = str.replace(",", ".").replace("%", "");
    return Number(num);
  }

  static getKeys(lang: "de" | "en"): ParserOptionsPsppKeys {
    const keys = {
      de: {
        skipKeys: ["Table: Zusammenfassung"],
        valueKey: "Spalte %",
        tableKey: "Table: ",
        totalKey: "Gesamt",
        totalLabel: "TOTAL",
      },
      en: {
        skipKeys: ["Table: Summary"],
        valueKey: "Column %",
        tableKey: "Table: ",
        totalKey: "Total",
        totalLabel: "TOTAL",
      },
    };
    return keys[lang] || keys.en;
  }
}
