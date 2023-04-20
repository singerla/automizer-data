import { ResultColumn, ResultRow } from "./types/types";
import {
  ChartBubble,
  ChartCategory,
  ChartData,
  ChartSeries,
  ChartValueStyle,
  TableData,
  TableRow,
  TableRowStyle,
} from "pptx-automizer";
import Modelizer from "./modelizer/modelizer";
import { Cell, Model, ProcessRowCb } from "./modelizer/modelizer-types";
import { vd } from "./helper";

export default class Convert {
  modelizer: Modelizer;

  constructor(modelizer: Modelizer) {
    this.modelizer = modelizer;
  }

  toSeriesCategories(): ChartData {
    if (this.#getFirstRow()) {
      const series = this.getSeries();
      const categories = <ChartCategory[]>[];

      this.#forEachRow((row) => {
        categories.push(this.#toCategory(row));
      });

      return {
        series: series,
        categories: categories,
      };
    }

    return {
      series: [],
      categories: [],
    };
  }

  toVerticalLines(params?: { yValueOffset?: number }): ChartData {
    const series = this.getSeries();
    const categories = <ChartCategory[]>[];
    const yValueOffset = params?.yValueOffset || 0;

    this.#forEachRow((row, r) => {
      categories.push({
        label: row.key,
        y: r + yValueOffset,
        values: row.cells().map((column) => column.toNumber()),
      });
    });

    return {
      series: series,
      categories: categories,
    };
  }

  toCombo(): ChartData {
    const series = this.getSeries();
    const categories = <ChartCategory[]>[];

    this.#forEachRow((row, r) => {
      categories.push({
        label: row.key,
        y: r + 0.5,
        values: row.cells().map((column) => column.toNumber()),
        styles: this.#extractValueStyle(row.cells()),
      });
    });

    return {
      series: series,
      categories: categories,
    };
  }

  toScatter(): ChartData {
    const series = this.getSeries();
    const categories = <ChartCategory[]>[];

    this.#forEachRow((row, r) => {
      categories.push({
        label: row.key,
        values: row.cells().map((cell) => {
          return {
            x: Number(cell.getPoint(0).value),
            y: Number(cell.getPoint(1).value),
          };
        }),
        styles: this.#extractPointStyle<ChartValueStyle>(row),
      });
    });

    return {
      series: series,
      categories: categories,
    };
  }

  toBubbles(): ChartData {
    const series = this.getSeries();
    const categories = <ChartCategory[]>[];

    this.#forEachRow((row, r) => {
      categories.push({
        label: row.key,
        values: row.cells().map((col: Cell) => {
          return <ChartBubble>{
            size: Number(col.getPoint(0).value),
            x: Number(col.getPoint(1).value),
            y: Number(col.getPoint(2).value),
          };
        }),
        styles: this.#extractPointStyle<ChartValueStyle>(row),
      });
    });

    return {
      series: series,
      categories: categories,
    };
  }

  toRowLabels(): TableData {
    const body = [];
    this.#forEachRow((row, r) => {
      body.push({
        values: [row.key],
        styles: this.#extractPointStyle<TableRowStyle>(row),
      });
    });

    return {
      body,
    };
  }

  toColumnLabels(): TableData {
    let series = <string[]>[];
    let styles = <any>[];
    const firstRow = this.#getFirstRow();
    if (firstRow) {
      series = firstRow.cells().map((col) => col.columnKey);
      styles = this.#extractPointStyle<TableRowStyle>(firstRow);
    }

    return {
      body: [
        {
          values: series,
          styles: styles,
        },
      ],
    };
  }

  toTableBody(): TableData {
    const body = [];
    this.#forEachRow((row, r) => {
      body.push({
        values: row.collect(),
      });
    });

    return {
      body,
    };
  }

  toTable(params?: any): TableData {
    const body = <TableRow[]>[];
    const firstRow = this.#getFirstRow();

    if (!firstRow) {
      return {
        body: [
          {
            values: [],
          },
        ],
      };
    }

    if (params?.showColumnLabels) {
      const header = [];
      if (params?.showRowLabels) {
        header.push("");
      }
      header.push(...firstRow.cells().map((col) => col.columnKey));

      body.push({
        values: header,
        // TODO: insert column label styles
      });
    }

    this.#forEachRow((row, r) => {
      const tableRow = [];
      const tableRowStyles: TableRowStyle[] = [];

      if (params?.showRowLabels) {
        tableRow.push(String(row.key));
        tableRowStyles.push(null);
      }

      row.cells().forEach((cell, c) => {
        tableRow.push(cell.getValue());
      });

      tableRowStyles.push(...this.#extractPointStyle<TableRowStyle>(row));

      body.push({
        values: tableRow,
        styles: tableRowStyles,
      });
    });

    return {
      body,
    };
  }

  toResultRows(): ResultRow[] {
    const body = <ResultRow[]>[];
    this.modelizer.processRows((row) => {
      const bodyRow = {
        key: row.key,
        cols: <ResultColumn[]>[],
      };
      row.cells().forEach((cell) => {
        const resultCol = <ResultColumn>{
          key: cell.columnKey,
          value: cell.getPoints(),
        };
        bodyRow.cols.push(resultCol);
      });
      body.push(bodyRow);
    });
    return body;
  }

  getSeries = (): ChartSeries[] => {
    return this.#getFirstRow()
      .cells()
      .map((col) => {
        const column = this.modelizer.getColumn(col.columnKey);
        const seriesStyle = column.style.get();
        return {
          label: col.columnKey,
          style: seriesStyle,
        };
      });
  };

  #getFirstRow() {
    return this.modelizer.getRow(0);
  }

  #forEachRow(cb: ProcessRowCb) {
    this.modelizer.processRows(cb);
  }

  #toCategory(row: Model) {
    return {
      label: row.key,
      values: row.cells().map((column) => column.toNumber()),
      styles: this.#extractPointStyle<ChartValueStyle>(row),
    };
  }

  #extractPointStyle<T>(row: Model): T[] {
    const styles = <T[]>[];

    row.cells().forEach((cell: Cell) => {
      const firstPoint = cell.getPoint();
      if (firstPoint?.style) {
        styles.push(firstPoint.style as T);
      } else {
        styles.push(null);
      }
    });

    return styles;
  }

  #extractValueStyle(cells: Cell[]) {
    return cells.map((cell) => cell.getPoint()?.style || null);
  }

  // renderCellValue(column: ResultColumn): ResultCell {
  //   if (!column) return "";
  //
  //   if (Array.isArray(column.value)) {
  //     if (!column.value[0] || column.value[0].value === null) {
  //       return "";
  //     }
  //
  //     if (column.value.length > 0) {
  //       return column.value[0].value;
  //     }
  //   }
  //
  //   if (typeof column.value === "number" || typeof column.value === "string") {
  //     return column.value;
  //   }
  //
  //   if (typeof column.value === "function") {
  //     return column.value;
  //   }
  //
  //   return "";
  // }

  // formatPointKeys(keys: any) {
  //   const rowOrColumn = ["row", "column", "nested"];
  //
  //   const queryResultKeys = <QueryResultKeys>{
  //     row: keys.row ? Object.keys(keys.row) : [],
  //     column: keys.column ? Object.keys(keys.column) : [],
  //     nested: keys.nested ? Object.keys(keys.nested) : [],
  //     category: [],
  //   };
  //
  //   for (const key in keys) {
  //     if (!rowOrColumn.includes(key)) {
  //       queryResultKeys.category.push({
  //         categoryId: Number(key),
  //         keys: Object.keys(keys[key]),
  //       });
  //     }
  //   }
  //
  //   return queryResultKeys;
  // }
}
