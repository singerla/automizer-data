import { DataPoint } from "./types";
import TransformResult from "./helper/transformResult";

/**
 * A Table is a set of rows.
 */
type Table = Row[];
/**
 * A row is a set of cells. Rows go from left to right.
 */
type Row = Cell[];
/**
 * A column is a set of cells that go from top to bottom inside a table.
 */
type Column = Cell[];
/**
 * A Cell holds an array of points associated to a row and a column.
 * The value of a cell is initially set by the first datapoint to initialize
 * the cell as well as the row key and the column key.
 */
type Cell = {
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
};

/**
 * A ModelRow holds all cells of a row. Each cell can be processed or logged.
 */
type ModelRow = {
  /**
   * Holds an array of all cells of the current row.
   */
  cells: Row;
  /**
   * Apply a callback to each cell of current row.
   */
  each: (cb: ModelEachCb) => ModelRow;
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
};

/**
 * A ModelColumn holds all cells of a column. Each cell can be processed or
 * logged.
 */
type ModelColumn = {
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
   * @param s1
   * @param s2
   */
  dump: (s1?: number, s2?: number) => void;
};
/**
 * Each cell can hold a value. The value is used to be displayed.
 */
type CellValue = string | number | null | undefined;
/**
 * A key is a selector to describe a target row or target column.
 * A numeric key will start from zero, a string key will match a named row or
 * column.
 */
type Key = string | number;
/**
 * There are "row" or "col" dimensions. "row" will go from left to right, while
 * "col" will go from to to bottom, both starting with zero.
 */
type KeyMode = "row" | "col";
/**
 * A table will be constructed by adding DataPoints.
 */
type AddPointsOptions = {
  rowKey?: KeyFromCb;
  colKey?: KeyFromCb;
  value?: ValueFromCb;
  filter?: (point) => boolean;
};
type KeyFromCb = (point: DataPoint) => string;
type ValueFromCb = (point: DataPoint) => CellValue;
type ModelEachCb = (cell: Cell) => void;

type RenderTableCb = (
  cell: Cell,
  r: number,
  c: number,
  rowKey: Key,
  colKey: Key
) => void;
type ProcessRowCb = (row: ModelRow, r: number, rowKey: Key) => void;
type ProcessColumnCb = (column: ModelColumn, c: number, colKey: Key) => void;

export default class Modelizer {
  table: Table = [];
  rowKeys: string[] = [];
  colKeys: string[] = [];
  strict: boolean;

  constructor(strict?: boolean) {
    this.strict = strict;
    this.rowKeys = [];
    this.colKeys = [];
  }

  /**
   * Apply a callback to each cell of the current table.
   * @param mode
   * @returns {string[]} immutable array of strings.
   */
  process(cb: RenderTableCb): this {
    this.rowKeys.forEach((rowKey, r) => {
      this.colKeys.forEach((colKey, c) => {
        const cell = this.getCell(r, c);
        cb(cell, r, c, rowKey, colKey);
      });
    });
    return this;
  }

  /**
   * Pass a callback to run on each row.
   * @param cb
   */
  processRows(cb: ProcessRowCb): this {
    this.rowKeys.forEach((rowKey, r) => {
      const row = this.getRow(r);
      cb(row, r, rowKey);
    });
    return this;
  }

  /**
   * Pass a callback to run on each column.
   * @param cb
   */
  processColumns(cb: ProcessColumnCb): this {
    this.colKeys.forEach((colKey, c) => {
      const column = this.getColumn(c);
      cb(column, c, colKey);
    });
    return this;
  }

  /**
   * Add an array of Datapoints to Modelizer. Each datapoint will create a
   * corresponding row- or column key, if not existing already.
   * Each point will create a cell.
   * If a point is added to an existing cell (because row and col key equal an
   * existing keypair), the point will push existing points in the target cell.
   * @param points An array of datapoints
   * @param options Specify where the target row-/column-keys are coming from
   * @return {this}
   */
  addPoints(points: DataPoint[], options?: AddPointsOptions): this {
    points.forEach((point) => {
      this.addPoint(point, options);
    });
    return this;
  }

  /**
   * Add a single Datapoint to the table. If the point matches an already
   * existing Cell by row and column key, the point will be added to the
   * stack of points of the matching Cell. Otherwise, a new row- and/or
   * column-key will be created according to the given datapoint.
   * @param point A datapoint
   * @param options Specify where the target row-/column-keys are coming from
   * @returns {this}
   */
  addPoint(point: DataPoint, options?: AddPointsOptions): this {
    const rowKey = options.rowKey ? options.rowKey(point) : point.row;
    const colKey = options.colKey ? options.colKey(point) : point.column;

    const r = this.addRow(rowKey);
    const c = this.addColumn(colKey);
    const cell = this.pushCellPoints(r, c, point);

    if (options.value) {
      const value = options.value(point);
      cell.setValue(value);
    } else if (cell.value === undefined) {
      cell.setValue(point.value);
    }

    return this;
  }

  /**
   * Retreive the current keys for row or column.
   * @param mode Pass "row" or "col" to specify the target dimension.
   * @returns {string[]} Array of strings containing the keys.
   */
  getKeys(mode: KeyMode): string[] {
    return [...this.#getKeys(mode)];
  }

  /**
   * Pass a string key to append a new row with that name.
   * @param key
   * @returns {number} Column index of the created row.
   */
  addRow(key: string): number {
    return this.#addKey(key, "row");
  }

  /**
   * Pass a string key to append a new column with that name.
   * @param key
   * @returns {number} Column index of the created column.
   */
  addColumn(key: string): number {
    return this.#addKey(key, "col");
  }

  #addKey(key: string, mode: KeyMode): number {
    const keys = this.#getKeys(mode);
    if (!keys.includes(key)) {
      this.#addKeyByMode(mode, key);
    }
    return keys.indexOf(key);
  }

  #getKeyName(mode: KeyMode): string {
    return mode + "Keys";
  }

  #getKeys(mode: KeyMode): string[] {
    const from = this.#getKeyName(mode);
    return this[from];
  }

  #getKey(key: Key, mode: KeyMode): string {
    const id = this.#parseCellKey(key, mode);
    return this.#getKeys(mode)[id];
  }

  #addKeyByMode(mode, key): void {
    const from = this.#getKeyName(mode);
    this[from].push(key);
  }

  /**
   * Pass a {CellValue} to a target {Cell}. The point will not change the
   * target cell value.
   * @param r Pass a number or a string to determine the target cell row.
   * @param c Pass a row or column key to target the cell.
   * @param point The point to push the cell's point stack with.
   */
  setCellValue(r: Key, c: Key, value: CellValue): Cell {
    const targetCell = this.getCell(r, c);
    targetCell.value = value;
    return targetCell;
  }

  /**
   * Pass a Datapoint to a target Cell. The point will not change the
   * target cell value.
   * @param r Pass a number or a string to determine the target cell row.
   * @param c Pass a row or column key to target the cell.
   * @param point The point to push the cell's point stack with.
   */
  pushCellPoints(r, c, point: DataPoint): Cell {
    const targetCell = this.getCell(r, c);
    targetCell.points.push(point);
    return targetCell;
  }

  /**
   * Retreive a row model object for the given row selector.
   * @param r Pass a number or a string to select the target row.
   * @return {{cells: Cell[], getCell: (c: Key) => Cell, setCellValue: (c: Key, value: CellValue) => ModelRow, dump: (s1: any, s2: any) => void, setCell: (c: Key, cell: Cell) => ModelRow, each: (cb: ModelEachCb) => {cells: Cell[], getCell: (c: Key) => Cell, setCellValue: (c: Key, value: CellValue) => ModelRow, dump: (s1: any, s2: any) => void, setCell: (c: Key, cell: Cell) => ModelRow, each: (cb: ModelEachCb) => any}}}
   */
  getRow(r: Key): ModelRow {
    const rowId = this.#parseCellKey(r, "row");
    const cells = this.table[rowId];
    const modelRow = {
      cells: cells,
      each: (cb: ModelEachCb) => {
        modelRow.cells.forEach((cell) => cb(cell));
        return modelRow;
      },
      getCell: (c: Key) => this.getCell(r, c),
      setCell: (c: Key, cell: Cell) => this.setCell(r, c, cell).getRow(),
      setCellValue: (c: Key, value: CellValue) =>
        this.setCellValue(r, c, value).getRow(),
      dump: (s1, s2) => this.dump(s1, s2, [r], []),
    };
    return modelRow;
  }

  /**
   * Retreive a column model object for the given column selector.
   * @param c Pass a number or a string to select the target column.
   * @return {ModelColumn} A model column object containing all cells.
   */
  getColumn(c: Key): ModelColumn {
    const colId = this.#parseCellKey(c, "col");
    const column = this.#getColumnCells(colId);
    const modelColumn = {
      cells: column,
      each: (cb: ModelEachCb) => {
        column.forEach((cell) => cb(cell));
        return modelColumn;
      },
      getCell: (r: number) => this.getCell(r, c),
      setCell: (r: number, cell: Cell) => this.setCell(r, c, cell).getColumn(),
      setCellValue: (r: number, value: CellValue) =>
        this.setCellValue(r, c, value).getColumn(),
      dump: (s1, s2) => this.dump(s1, s2, [], [c]),
    };
    return modelColumn;
  }

  #getColumnCells(c: number) {
    return this.rowKeys.map((rowKey, r) => this.getCell(r, c));
  }

  /**
   * Retrieve a cell by row and column key.
   * If no cell matches the given keys, a new cell will be created (non-strict).
   * In strict mode, Modelizer will throw an error.
   * @param r Set a numeric or string value to address the target row
   * @param c Set a numeric or string value to address the target column
   * @returns {Cell}
   */
  getCell(r: Key, c: Key): Cell {
    const rowId = this.#parseCellKey(r, "row");
    const colId = this.#parseCellKey(c, "col");

    this.#initializeCell(rowId, colId);

    return this.table[rowId][colId];
  }

  /**
   * Update a Cell object at the given keys or create one.
   * In strict mode, Modelizer will throw an error.
   * @param rowKey Set a numeric or string value to address the target row
   * @param colKey Set a numeric or string value to address the target column
   * @param cell Set a numeric or string value to address the target column
   * @returns {Cell}
   */
  setCell(rowKey: Key, colKey: Key, cell: Cell): Cell {
    const r = this.#parseCellKey(rowKey, "row");
    const c = this.#parseCellKey(colKey, "row");

    this.#initializeCell(r, c);
    this.table[r][c] = cell;

    return this.table[r][c];
  }

  #initializeCell(r: number, c: number): void {
    this.#initializeRow(r);
    this.table[r][c] = this.table[r][c] || this.#defaultCell(r, c);
  }

  #initializeRow(r: number): void {
    this.table[r] = this.table[r] || [];
  }

  #parseCellKeys(keys: Key[], mode: KeyMode): number[] {
    if (!keys) return [];
    return keys.map((key) => this.#parseCellKey(key, mode));
  }

  #parseCellKey(key: Key, mode: KeyMode): number {
    const keys = this.#getKeys(mode);

    if (typeof key === "number") {
      if (keys[key]) return key;
      this.#handleError(
        `Key of '${mode}' not found: ${key}. Length is keys are: ${keys.length}`
      );
    }

    if (typeof key === "string") {
      const index = keys.indexOf(key);
      if (index < 0) {
        return this.#createOrFailKey(key, mode, keys);
      }
      return index;
    }

    this.#handleError(`Could not determine '${mode}' key: ${key}`);
  }

  #createOrFailKey(key: string, mode: KeyMode, keys: string[]) {
    if (this.strict) {
      const available = keys.join(" | ");
      const message = `Key of '${mode}' not found: ${key}. Available keys are: ${available}`;
      this.#handleError(message);
    } else {
      this.#addKey(key, mode);
      return this.#parseCellKey(key, mode);
    }
  }

  /**
   * Initialize a cell. Cell is an object associated to a row- and a column key.
   * A cell can have zero or more Datapoints. The first datapoint to be passed
   * to a cell will define the cell value. The cell value can be altered
   * afterwards.
   * @param r
   * @param c
   * @returns {{col: number, colKey: string, getPoint: (i) => DataPoint, getRow: () => ModelRow, points: DataPoint[], getValue: () => number | string, setValue: (value: CellValue) => string | number, getColumn: () => ModelColumn, row: number, dump: () => void, value: undefined, toNumber: () => number, rowKey: string}}
   */
  #defaultCell(r: number, c: number): Cell {
    const cell = {
      value: undefined,
      row: r,
      col: c,
      rowKey: this.#getKey(r, "row"),
      colKey: this.#getKey(c, "col"),
      points: <DataPoint[]>[],
      getPoint: (i?: number) => {
        return cell.points[i || 0] || TransformResult.createDataPoint();
      },
      getValue: () => cell.value || cell.getPoint(0).value,
      setValue: (value: CellValue) => (cell.value = value),
      getRow: () => this.getRow(cell.row),
      getColumn: () => this.getColumn(cell.col),
      toNumber: () => Number(cell.getValue()),
      dump: () => this.#dumpCell(cell),
    };

    return cell;
  }

  /**
   * Log contents of the current cell to console.
   * @param cell
   * @private
   */
  #dumpCell(cell: Cell): void {
    const contents = {
      value: cell.value,
      row: cell.rowKey + " (" + cell.row + ")",
      col: cell.colKey + " (" + cell.col + ")",
      points: cell.points.map((point) => {
        return {
          value: point.value,
          meta: point.meta,
          tags: point.tags,
        };
      }),
    };
    console.dir(contents, { depth: 10 });
  }

  #filterCellKeys(keys: Key[], mode: KeyMode) {
    const ids = this.#parseCellKeys(keys, mode);
    const allKeys = this.#getKeys(mode);
    return allKeys.filter((key, c) => ids.length === 0 || ids.includes(c));
  }

  /**
   * Specify "row" or "col" and an array of keys to filter and sort the target
   * dimension of current table.
   * @param mode
   * @param keys
   */
  sort(mode: KeyMode, keys: Key[]): this {
    const ids = this.#parseCellKeys(keys, mode);
    const existingKeys = this.#getKeys(mode);
    const keyName = this.#getKeyName(mode);

    const sortedKeys = [];
    ids.forEach((id) => {
      sortedKeys.push(existingKeys[id]);
    });
    this[keyName] = sortedKeys;

    if (mode === "col") {
      this.table.forEach((row, r) => {
        const cols = [];
        ids.forEach((id) => {
          cols.push(row[id]);
        });
        this.table[r] = cols;
      });
    }

    if (mode === "row") {
      const filteredRows = [];
      ids.forEach((id) => {
        filteredRows.push(this.table[id]);
      });
      this.table = filteredRows;
    }

    return this;
  }

  /**
   * Write the contents of current table to the console.
   * @param firstColSize Specify the number of characters for label width.
   * @param colSize Number of characters for body column width.
   * @param rows Restrict the outputted rows to a given set of keys.
   * @param cols Restrict the outputted columns to a given set of keys.
   * @param renderCell Pass a callback to display customized information.
   */
  dump(
    firstColSize?: number,
    colSize?: number,
    rows?: Key[],
    cols?: Key[],
    renderCell?
  ) {
    firstColSize = firstColSize || 10;
    colSize = colSize || 8;

    const strict = this.strict;
    this.strict = true;

    const rowKeys = this.#filterCellKeys(rows, "row");
    const colKeys = this.#filterCellKeys(cols, "col");

    this.#dumpHeader(firstColSize, colSize, colKeys);
    this.#dumpBody(firstColSize, colSize, rowKeys, colKeys, renderCell);
    this.#dumpFooter(firstColSize, colSize, colKeys);

    this.strict = strict;
  }

  #dumpHeader(firstColSize: number, colSize: number, colKeys: string[]) {
    console.log();
    let header = this.#toColSize("", firstColSize);
    colKeys.forEach((colKey, c) => {
      header = header + this.#toColSize(colKey, colSize);
    });
    console.log(header);
  }

  #dumpBody(
    firstColSize: number,
    colSize: number,
    rowKeys: string[],
    colKeys: string[],
    renderCell
  ) {
    rowKeys.forEach((rowKey, r) => {
      let row = this.#toColSize(rowKey, firstColSize);
      colKeys.forEach((colKey, c) => {
        const cell = this.getCell(rowKey, colKey);
        const value = renderCell ? renderCell(cell) : cell.getValue();
        row = row + this.#toColSize(value, colSize);
      });
      console.log(row);
    });
  }

  #dumpFooter(firstColSize: number, colSize: number, colKeys: string[]) {
    const line = this.#toColSize(
      "-",
      firstColSize + colSize * colKeys.length,
      "-"
    );
    console.log(line);
  }

  #toColSize(s: string | number, size: number, fill?: string): string {
    fill = fill || " ";
    let content = String(s);
    const right = size - content.length;
    if (right > 0) {
      for (let i = 0; i <= right; i++) {
        content = content + fill;
      }
      return content;
    }

    return content.slice(0, size + 1);
  }

  #handleError(message: string) {
    throw new Error(message);
  }
}
