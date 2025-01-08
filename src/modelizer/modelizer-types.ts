import { DataPoint } from '../types/types';

export interface Style {
  assign(style: any): void;

  get(): any;
}

export type ModelMeta = {
  key: string;
  value: any;
};

export interface Meta {
  set(metaKey: string, metaValue: ModelMeta['value']): void;

  get(metaKey: string): ModelMeta;

  state: ModelMeta[];
}

export type ModelizerOptions = {
  strict?: boolean;
  points?: DataPoint[];
};

export type InputKeys = {
  row: string[];
  column: string[];
  nested: string[];
  category: InputCategoryKeys[];
  byCategoryId: (id: number) => string[];
  hasKey: (key: string, section: keyof Keys | number) => boolean;
};

export type InputCategoryKeys = {
  categoryId: number;
  keys: string[];
};

export type Keys = {
  row: string[];
  column: string[];
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
   * The key of the current column,
   * by default given from first point.
   */
  rowKey: string;
  /**
   * The key of the current column,
   * by default given from first point.
   */
  columnKey: string;
  /**
   * An array of datapoints associated with the current Cell.
   * By default, the first point initializes the cell and passes
   * its value, row- and columns-key.
   */
  points: DataPoint[];
  /**
   * Get the i-th point associated with current cell.
   * Skip i to retrieve the first point.
   * @param i
   */
  getPoint: (i?: number, forceCreate?: boolean) => DataPoint;
  getPoints: () => DataPoint[];
  setPoints: (points: DataPoint[]) => void;
  createPoint: (value?) => DataPoint;
  addPoint: (point: DataPoint) => Cell;
  /**
   * Get the current value of cell. If no changes were made, this is the
   * value of first datapoint.
   */
  getValue: () => CellValue;
  /**
   * Set current value of cell. The cell value will be used as final output.
   * @param value
   */
  setValue: (value: CellValue) => Cell;
  /**
   * Retrieve all neighbour cells from left to right of the current cell,
   * including the current cell.
   */
  getRow: () => Model;
  /**
   * Retrieve all cells from the same column of the current cell,
   * including the current cell.
   */
  getColumn: () => Model;
  /**
   * Get the current cell value as a number.
   * Set precision to specify the precision to round to.
   */
  toNumber: (precision?: number) => number;
  /**
   * Get the current cell value as a number or empty string.
   */
  toNumberOrEmpty: () => number | '';
  /**
   * Get the current cell value as a number or a string,
   * trying to convert
   *  - a number-like value into a number
   *  - an invalid or empty cell value into an empty string
   *  - a non-number-like string value into a string
   *
   *  An undefined value will leave the target cell untouched
   */
  toCell: () => number | string | '' | undefined;
  /**
   * Log contents of the current cell to console.
   */
  dump: () => void;
  /**
   * Define a point from Cell['points'] to hold the source data (instead of point 0).
   */
  targetPoint?: number;
  setTargetPoint?: (i?: number) => Cell;
  getTargetPoint?: () => number;

  selections: number[];
  addSelection: (id: number) => void;
  hasSelection: (ids: number | number[]) => boolean;

  meta: any;
}

/**
 * A Model holds all cells of a row or a column.
 * Each cell can be processed or its content can be logged.
 */
export interface Model {
  /**
   * The key of current row as added to rowKeys. Must be unique.
   */
  key: string;
  /**
   * The label to display when model is printed. Defaults to Model.key.
   * You can have the same label in rows/columns more than once.
   */
  label: string;
  /**
   * Get the label to display.
   * It is equal to Model.key unless you did updateKey with updateLabel=true.
   */
  getLabel: () => string;
  /**
   * Whether the model is a row or a column.
   */
  mode: KeyMode;
  /**
   * Retrieve Index of current row or column, starting from 0.
   */
  id: () => number;
  /**
   * Get current sortation index of row or column, starting from 0.
   */
  getIndex: () => number;

  hasSelection: (ids: number | number[]) => boolean;
  /**
   * Holds an array of all cells of the current row.
   */
  cells: () => Cell[];
  /**
   * Apply a callback to each cell of current row.
   */
  each: (cb: ModelEachCb) => Model;
  /**
   * Retrieve an array of all cell values.
   */
  collect: (cb?: (cell: Cell) => boolean | null) => number[];
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
  setCellValue: (c: Key, cellValue: CellValue) => Model;
  /**
   * Update an existing cell.
   * @param c
   * @param cell
   */
  setCell: (c: Key, cell: Cell) => Model;
  /**
   * Update the key of current row/column. This will also update the row label.
   * Modelizer can't handle duplicate keys per rows/columns.
   * If you need non-unique keys, use updateLabel
   * to separate string for label when printing.
   *
   * @param newKey
   * @param updateLabel Update only label and leave key untouched
   */
  updateKey: (newKey: string) => Model;
  /**
   * Update the label of current row/column and leave key untouched.
   *
   * @param newLabel
   */
  updateLabel: (newLabel: string) => Model;
  /**
   * Drop the current row/column
   */
  drop: () => void;
  /**
   * Update the position of current row/column.
   * Skip beforeKey to append the model.
   * @param atKey
   */
  insertBefore: (atKey?: Key) => Model;
  /**
   * Holds a style to pass it to pptx automizer later.
   */
  style: Style;
  /**
   * Holds meta information for whole row or column.
   */
  meta: Meta;
  /**
   * Log contents of the current row to console.
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
 * "col" will go from top to bottom, both starting by zero.
 */
export type KeyMode = 'row' | 'column';
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
  colKey: Key,
) => void;
export type ProcessRowCb = (row: Model, r: number, rowKey: Key) => void;
export type ProcessColumnCb = (column: Model, c: number, colKey: Key) => void;
