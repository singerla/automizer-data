import { ResultColumn, ResultRow } from './types/types';
import {
  ChartBubble,
  ChartCategory,
  ChartData,
  ChartSeries,
  ChartValueStyle,
  TableData,
  TableRow,
  TableRowStyle,
} from 'pptx-automizer';
import Modelizer from './modelizer/modelizer';
import { Cell, Model, ProcessRowCb } from './modelizer/modelizer-types';
import { vd } from './helper';

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
        categories.push(this.#toCategory(row) as ChartCategory);
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
        label: row.getLabel(),
        y: r + yValueOffset,
        values: row.cells().map((column) => column.toNumberOrEmpty() as number),
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
        label: row.getLabel(),
        y: r + 0.5,
        values: row.cells().map((column, c) => {
          return column.toNumberOrEmpty() as number;
        }),
        styles: this.#extractValueStyle(row.cells()) as ChartValueStyle[],
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
        label: row.getLabel(),
        values: row.cells().map((cell) => {
          return {
            x: cell.getPoint(0)?.value as number,
            y: cell.getPoint(1)?.value as number,
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
        label: row.getLabel(),
        values: row.cells().map((col: Cell) => {
          return <ChartBubble>{
            size: Number(col.getPoint(0)?.value),
            x: Number(col.getPoint(1)?.value),
            y: Number(col.getPoint(2)?.value),
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
        values: [row.getLabel()],
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
      series = [...this.modelizer.getLabels('column')];
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
        values: row.cells().map((cell) => cell.toCell()),
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

    const header = [];
    if (params?.showColumnLabels) {
      const headerRow = [];
      if (params?.showRowLabels) {
        headerRow.push('');
      }

      const columnLabels = this.#getColumnLabels();
      headerRow.push(...columnLabels);

      body.push({
        values: headerRow,
        // TODO: insert column label styles
      });

      header.push({
        values: columnLabels,
        spans: firstRow.cells().map(() => 1),
        styles: [],
      });
    }

    this.#forEachRow((row, r) => {
      const tableRow = [];

      const tableRowStyles: TableRowStyle[] = [];

      if (params?.showRowLabels) {
        tableRow.push(String(row.getLabel()));
        const rowStyle = row.style.get();
        tableRowStyles.push(rowStyle);
      }

      row.cells().forEach((cell, c) => {
        tableRow.push(cell.toCell());
      });

      tableRowStyles.push(...this.#extractPointStyle<TableRowStyle>(row));

      body.push({
        values: tableRow,
        styles: tableRowStyles,
      });

      const headerRow = [];
      const spansRow = <any>[];
      row.cells().forEach((cell, c) => {
        const isHeader = cell.getPoint()?.getMeta('isHeader');
        if (isHeader?.value) {
          headerRow.push(cell.toCell());
          const spans = cell.getPoint()?.getMeta('spans');
          if (spans?.value) {
            spansRow.push(spans.value);
          } else {
            spansRow.push(null);
          }
        }
      });

      if (headerRow.length > 0) {
        header.push({
          values: headerRow,
          styles: tableRowStyles,
          spans: spansRow,
        });
      }
    });

    return {
      header,
      body,
    };
  }

  toResultRows(): ResultRow[] {
    const body = <ResultRow[]>[];
    const columnLabels = this.#getColumnLabels();

    this.modelizer.processRows((row) => {
      const bodyRow = {
        key: row.getLabel(),
        cols: <ResultColumn[]>[],
      };
      row.cells().forEach((cell, c) => {
        const resultCol = <ResultColumn>{
          key: columnLabels[c] || cell.columnKey,
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
          label: column.getLabel(),
          style: seriesStyle,
        };
      });
  };

  #getFirstRow() {
    return this.modelizer.getRow(0);
  }

  #getColumnLabels() {
    return this.modelizer.getLabels('column');
  }

  #forEachRow(cb: ProcessRowCb) {
    this.modelizer.processRows(cb);
  }

  #toCategory(row: Model) {
    return {
      label: row.getLabel(),
      values: row.cells().map((column) => column.toNumberOrEmpty()),
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
}
