import {
  Datasheet,
  ParserOptions,
  RawResultData,
  RawResultMeta,
  RawRow,
} from "../types/types";
import { Parser } from "./parser";
import ExcelJS from "exceljs";
import {
  calculateCellConditionalStyle,
  CellStyle,
} from "../helper/conditionalFormatting";
import {
  ColorConverter,
  createColorConverter,
  ExcelColor,
} from "../helper/convertWorkbookColors";
import { indexedColors } from "../helper/defaultThemeColors";
import { TimeTracker } from "../helper/timeTracker";

export const timer = new TimeTracker();

import path from "path";
import { vd } from "../helper";

type WorksheetDataCell = {
  value: ExcelJS.Cell["value"];
  cell: ExcelJS.Cell;
  conditionalStyle: CellStyle;
  styleResult: {
    bgColor?: string;
    fontColor?: string;
  };
};

type WorksheetData = WorksheetDataCell[][];

type WorksheetWithFormattings = ExcelJS.Worksheet & {
  conditionalFormattings: any;
};

type HeaderLevels = { [key: number]: Array<string | null> };

interface ParsedHeaders {
  headerLevels: HeaderLevels;
  categories: Array<string | null>;
}

interface Slice {
  start: number;
  end: number;
  tags: Array<{ value: string; category: string }>;
}

interface TableMeta {
  key: string;
  value: string;
  info?: any[];
  data?: any[];
}

interface TableData {
  body: any[][];
  meta: TableMeta[];
  header: any[];
  section: string;
  topic: string;
  vartitle: string;
}

interface InfoItem {
  value: string;
  key: string;
}

interface RowStyle {
  bgColor?: string;
}

interface MetaEntry {
  key: string;
  value: string;
  info: any[];
}


export class Tagged extends Parser {
  private mapCategories: any;
  private tagsMarker: string;
  private metaKey: string;
  private totalLabel: string;
  private colorConverter: ColorConverter;

  constructor(config: ParserOptions) {
    super(config);
  }

  async fromXlsx(file: string): Promise<Datasheet[]> {
    this.file = path.basename(file);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file, {
      cellStyles: true,
      richTextParse: true,
    } as any);

    this.colorConverter = createColorConverter(workbook, indexedColors.new);

    for (const worksheet of workbook.worksheets as WorksheetWithFormattings[]) {
      // Convert ExcelJS format to compatible format for existing parseWorksheet method
      const data: WorksheetData = [];

      timer.start("worksheet");

      worksheet.eachRow((row, rowNumber) => {
        const rowData: WorksheetDataCell[] = [];
        row.eachCell((cell: any, colNumber) => {
          const tmpCell: WorksheetDataCell = {
            value:
              typeof cell.value === "object" ? cell.value.result : cell.value,
            cell,
            conditionalStyle: null,
            styleResult: {},
          };

          if (this.config.calculateConditionalStyle) {
            this.calculateConditionalStyle(tmpCell, cell, worksheet);
          }

          rowData[colNumber - 1] = tmpCell;
        });
        data.push(rowData);
      });

      timer.stop("worksheet");

      console.log("finished parsing data: " + data.length + " rows");

      this.parseWorksheet(data);
    }

    timer.printStats();

    return this.datasheets;
  }

  calculateConditionalStyle = (
    tmpCell: WorksheetDataCell,
    cell: ExcelJS.Cell,
    worksheet: WorksheetWithFormattings
  ) => {
    const conditionalStyle = calculateCellConditionalStyle(
      cell,
      worksheet.conditionalFormattings
    );
    if (conditionalStyle) {
      tmpCell.conditionalStyle = conditionalStyle;
      tmpCell.styleResult = {};
      if (conditionalStyle?.fill?.bgColor) {
        tmpCell.styleResult.bgColor = this.colorConverter(
          conditionalStyle?.fill.bgColor
        );
      }
      if (conditionalStyle?.font?.color) {
        tmpCell.styleResult.fontColor = this.colorConverter(
          conditionalStyle?.font.color
        );
      }
    }
  };

  parseWorksheet(data: WorksheetData) {
    console.log("File rows count: " + String(data.length));

    this.metaKey = this.config.metaKey || "Base";
    this.totalLabel = this.config.totalLabel || "Total";
    this.mapCategories = this.config.mapCategories || {};
    this.tagsMarker = this.config.metaKey || "@Tags";

    const header = this.parseHeader(data);
    const allTables = this.parseData(data);

    this.results = this.sliceTables(allTables, header);

    this.setDatasheets();
  }

  parseHeader = (data: WorksheetData) => {
    const { headerLevels, categories } = this.parseHeaderLevels(data);

    const sliceAtCol = <Record<any, any>>{};
    let previousColId = 0;
    const previousValues = {};
    const headerCache = [];
    for (const colId in headerLevels) {
      headerLevels[colId].forEach((cell, level) => {
        if (cell !== null) {
          previousValues[level] = cell;
        }
      });

      const hasDefined = headerLevels[colId].find((cell) => cell !== null);

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

    const colCount = data.find(
      (row) => row[1] && row[1].value.toString() === this.metaKey
    ).length;

    Object.values(sliceAtCol).forEach((header) => {
      // Last slice won't have an end; using colCount.
      if (header.end === null) {
        header.end = colCount;
      }
      headerCache.push(header);
    });

    return headerCache;
  };

  parseHeaderLevels = (data: WorksheetData): ParsedHeaders => {
    const headerLevels: HeaderLevels = {};
    const categories: Array<string | null> = [];

    // Find the row containing metaKey in the second column
    const metaKeyRow = data.find(
      (row) => row.length > 1 && row[1]?.value === this.metaKey
    );

    if (!metaKeyRow) {
      console.error(`Could not count cols: no metaKey: ${this.metaKey}`);
      return { headerLevels, categories };
    }

    const colCount = metaKeyRow.length;

    let isHeader = false;

    data.forEach((row) => {
      // Skip empty rows
      if (this.isRowEmpty(row)) return;

      const firstCellValue = row[0]?.value;

      // Check if this is the start of a header section
      if (
        firstCellValue &&
        typeof firstCellValue === "string" &&
        firstCellValue.startsWith("@")
      ) {
        isHeader = true;
      }
      // Check if this is the end of a header section
      else if (firstCellValue && String(firstCellValue).length > 0) {
        isHeader = false;
      }
      // Process header rows
      else if (isHeader) {
        // Get category from second column
        const category = row[1]?.value.toString() ?? null;
        categories.push(category);

        // Process header levels starting from third column
        for (let c = 2; c < colCount; c++) {
          headerLevels[c] = headerLevels[c] || [];
          headerLevels[c].push(row[c]?.value.toString() ?? null);
        }
      }
    });

    return { headerLevels, categories };
  };

  private isRowEmpty = (row: WorksheetData[number]): boolean => {
    return !row.some((cell) => {
      const value = cell?.value;
      return value !== null && value !== undefined && value !== "";
    });
  };

  parseData = (data: WorksheetData): TableData[] => {
    const allTables: TableData[] = [];
    let currentSection = this.totalLabel;
    let currentTopic = this.totalLabel;
    let currentVartitle = this.totalLabel;
    let currentHeader: string[] = [];

    data.forEach((row) => {
      const firstCell = row[0]?.value;
      const secondCell = row[1]?.value;
      const dataCell = row[2]?.value;

      // Check if the third cell has any meaningful data
      const hasData =
        dataCell !== undefined &&
        (typeof dataCell === "number" ||
          (typeof dataCell === "string" && dataCell.length > 0));

      // Section change - only first cell has value
      if (firstCell && !secondCell) {
        currentSection = String(firstCell);
        currentTopic = this.totalLabel;
        currentVartitle = this.totalLabel;
      }

      // Skip processing if we're in tags section
      if (currentSection === this.tagsMarker) {
        return;
      }

      // Topic change - header row
      if (!firstCell && secondCell && typeof dataCell === "string") {
        currentTopic = String(secondCell);
        currentHeader = row.map((cell) => cell.value.toString());
      }

      // Vartitle change - second cell but no data
      if (!firstCell && secondCell && !hasData) {
        currentVartitle = String(secondCell);
      }

      // Data row - has second cell and numeric data
      if (!firstCell && secondCell && typeof dataCell === "number") {
        const table = this.findOrCreateTable(
          currentSection,
          currentTopic,
          currentVartitle,
          allTables
        );

        table.header = currentHeader;

        // Meta row
        if (secondCell === this.metaKey) {
          table.meta.push({
            key: "base",
            value: "Basis",
            data: row.map((cell) => cell.value) as RawRow,
          });
        } else {
          // Regular data row
          table.body.push(row.map((cell) => cell.value));
          this.processTableMeta(row, secondCell, table);
        }
      }
    });

    return allTables;
  };

  private findOrCreateTable = (
    section: string,
    topic: string,
    vartitle: string,
    tables: TableData[],
  ): TableData => {
    let table = tables.find(
      (t) =>
        t.section === section && t.topic === topic && t.vartitle === vartitle
    );

    if (!table) {
      table = {
        section,
        topic,
        vartitle,
        header: [],
        meta: [],
        body: [],
      };
      tables.push(table);
    }

    return table;
  };

  processTableMeta(
    row: any[],
    secondCell: any,
    table: TableData
  ): void {
    const styleResultsEntry = this.processStyleResults(row, secondCell);
    if (styleResultsEntry) {
      table.meta.push(styleResultsEntry);
    }

    const rowStyleEntry = this.processRowStyles(row, secondCell);
    if (rowStyleEntry) {
      table.meta.push(rowStyleEntry);
    }
  }

  processStyleResults(row: any[], secondCell: any): MetaEntry | null {
    const styleResults = row.map(cell => cell.styleResult);

    // const styleResultsRaw = row.map(cell => cell.conditionalStyle);
    // vd(styleResultsRaw)

    if (!styleResults.some(styleResult => Object.keys(styleResult).length)) {
      return null;
    }

    return {
      key: "styleResults",
      value: secondCell.toString(),
      info: styleResults,
    };
  }

  processRowStyles(row: any[], secondCell: any) {
    const rowStyle = this.extractRowStyle(row[1].cell.style);

    if (!Object.keys(rowStyle).length) {
      return null;
    }

    const styleResults = row.map(cell => rowStyle);

    return {
      key: "rowStyle",
      value: secondCell.toString(),
      info: styleResults,
    };
  }

  extractRowStyle(cellStyle: any): RowStyle {
    const rowStyle: RowStyle = {};

    if (cellStyle?.fill?.fgColor) {
      rowStyle.bgColor = this.colorConverter(cellStyle.fill.fgColor);
    }

    return rowStyle;
  }

  sliceTables = (
    allTables: TableData[],
    headerSlices: Slice[]
  ): RawResultData[] => {
    return allTables.flatMap((table) =>
      headerSlices.map((slice) => this.processTableSlice(table, slice))
    );
  };

  private processTableSlice = (
    table: TableData,
    slice: Slice
  ): RawResultData => {
    return {
      body: this.sliceTableBody(table.body, slice),
      meta: this.sliceTableMeta(table.meta, slice, table.header),
      header: [table.header.slice(slice.start, slice.end)],
      info: this.createTableInfo(table, slice),
    };
  };

  private sliceTableBody = (body: any[][], slice: Slice): any[][] => {
    return body.map((row) => [row[1], ...row.slice(slice.start, slice.end)]);
  };

  private sliceTableMeta = (
    tableMeta: TableMeta[],
    slice: Slice,
    header: any[]
  ): RawResultMeta[] => {
    return tableMeta
      .map((meta) => {
        const result: RawResultMeta = {
          key: meta.key,
          label: meta.value,
        };

        if (meta.data) {
          result.data = ["Meta", ...meta.data.slice(slice.start, slice.end)];
        }

        if (meta.info) {
          const info = meta.info.slice(slice.start, slice.end);

          if (info.find((infoVal) => infoVal !== undefined)) {
            const info: any = [];
            for (let c = slice.start; c < slice.end; c++) {
              if (meta.info[c]) {
                info.push({
                  key: meta.key,
                  value: header[c],
                  info: meta.info[c],
                });
              }
            }
            result.info = ["Info", ...info];
          }
        }
        return result;
      })
      .filter((meta) => meta.data || meta.info);
  };

  private createTableInfo = (table: TableData, slice: Slice): InfoItem[] => {
    const baseInfo: InfoItem[] = [
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
    ];

    const tagInfo: InfoItem[] = slice.tags.map((tag) => ({
      value: tag.value,
      key: tag.category,
    }));

    return [...baseInfo, ...tagInfo];
  };
}
