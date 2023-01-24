import { DataPoint } from "./types";

export type ModelizerOptions = {
  strict?: boolean;
  points?: DataPoint[];
};
/**
 * A Table is a set of rows.
 */
export type Table = Row[];
/**
 * A row is a set of cells. Rows go from left to right.
 */
export type Row = Cell[];
/**
 * A column is a set of cells that go from top to bottom inside a table.
 */
export type Column = Cell[];
/**
 * A Cell holds an array of points associated to a row and a column.
 * The value of a cell is initially set by the first datapoint to initialize
 * the cell as well as the row key and the column key.
 */
export interface Cell {
  /**
   * The cell value will be used as final output.
   */
  value: CellValue;
  /**
   * The number of the current row, starting from zero.
   */
  row: number;
  /**
   * The number of the current column, starting from zero.
   */
  col: number;
  /**
   * The key of the current column,
   * by default given from first point.
   */
  rowKey: string;
  /**
   * The key of the current row,
   * by default given from first point.
   */
  colKey: string;
  /**
   * An array of datapoints associated with the current Cell.
   * By default, the first point initializes the cell and passes
   * its value, row- and columns-key.
   */
  points: DataPoint[];
  /**
   * Get the i-th point associated with current cell.
   * Skip i to retreive the first point.
   * @param i
   */
  getPoint: (i?: number) => DataPoint;
  /**
   * Get the current value of cell. If no changes were made, this is the
   * value of first datapoint.
   */
  getValue: () => CellValue;
  /**
   * Set current value of cell. The cell value will be used as final output.
   * @param value
   */
  setValue: (value: CellValue) => void;
  /**
   * Retreive all neighbour cells from left to right of the current cell,
   * including the current cell.
   */
  getRow: () => ModelRow;
  /**
   * Retreive all cells from the same column of the current cell,
   * including the current cell.
   */
  getColumn: () => ModelColumn;
  /**
   * Get the current cell value as a number.
   */
  toNumber: () => number;
  /**
   * Log contents of the current cell to console.
   */
  dump: () => void;
}

/**
 * A ModelRow holds all cells of a row. Each cell can be processed or logged.
 */
export interface ModelRow {
  /**
   * The key of current row as added to rowKeys.
   */
  key: string;
  /**
   * Index of current row, starting from 0.
   */
  id: number;
  /**
   * Holds an array of all cells of the current row.
   */
  cells: Row;
  /**
   * Apply a callback to each cell of current row.
   */
  each: (cb: ModelEachCb) => ModelRow;
  /**
   * Retrieve an array of all cell values.
   */
  collect: () => CellValue[];
  /**
   * Retrieve a cell from current row by key.
   * @param c
   */
  getCell: (c: Key) => Cell;
  /**
   * Set a cell value by key.
   * @param c
   * @param cellValue
   */
  setCellValue: (c: Key, cellValue: CellValue) => ModelRow;
  /**
   * Update an existing cell.
   * @param c
   * @param cell
   */
  setCell: (c: Key, cell: Cell) => ModelRow;
  /**
   * Log contents of the current row to console.
   */
  dump: (s1?: number, s2?: number) => void;
}

/**
 * A ModelColumn holds all cells of a column. Each cell can be processed or
 * logged.
 */
export interface ModelColumn {
  /**
   * The key of current column as added to columnKeys.
   */
  key: string;
  /**
   * Index of current column, starting from 0.
   */
  id: number;
  /**
   * Holds an array of all cells of the current column.
   */
  cells: Column;
  /**
   * Apply a callback to each cell of current column.
   */
  each: (cb: ModelEachCb) => ModelColumn;
  /**
   * Retrieve a cell from current column by key.
   * @param r
   */
  getCell: (r: Key) => Cell;
  /**
   * Retrieve an array of all cell values.
   */
  collect: () => CellValue[];
  /**
   * Set a cell value by key.
   * @param r
   * @param cellValue
   */
  setCellValue: (r: Key, cellValue: CellValue) => ModelColumn;
  /**
   * Update an existing cell.
   * @param r
   * @param cell
   */
  setCell: (r: Key, cell: Cell) => ModelColumn;
  /**
   * Log contents of the current column to console.
   * @param s1 Width of first column
   * @param s2 Width of body columns
   */
  dump: (s1?: number, s2?: number) => void;
}
/**
 * Each cell can hold a value. The value is used to be displayed.
 */
export type CellValue = string | number | null | undefined;
/**
 * A key is a selector to describe a target row or target column.
 * A numeric key will start from zero, a string key will match a named row or
 * column.
 */
export type Key = string | number;
/**
 * There are "row" or "col" dimensions. "row" will go from left to right, while
 * "col" will go from to to bottom, both starting with zero.
 */
export type KeyMode = "row" | "col";
/**
 * A table will be constructed by adding DataPoints.
 */
export type AddPointsOptions = {
  rowKey?: KeyFromCb;
  colKey?: KeyFromCb;
  value?: ValueFromCb;
  filter?: (point) => boolean;
};
export type KeyFromCb = (point: DataPoint) => string;
export type ValueFromCb = (point: DataPoint) => CellValue;
export type ModelEachCb = (cell: Cell) => void;
export type RenderTableCb = (
  cell: Cell,
  r: number,
  c: number,
  rowKey: Key,
  colKey: Key
) => void;
export type ProcessRowCb = (row: ModelRow, r: number, rowKey: Key) => void;
export type ProcessColumnCb = (
  column: ModelColumn,
  c: number,
  colKey: Key
) => void;
