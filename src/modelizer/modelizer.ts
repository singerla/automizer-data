import { DataPoint } from "../types/types";
import { Query } from "../index";
import _ from "lodash";
import {
  AddPointsOptions,
  Cell,
  CellValue,
  Key,
  KeyMode,
  Keys,
  Model,
  ModelEachCb,
  ModelizerOptions,
  ProcessColumnCb,
  ProcessRowCb,
  RenderTableCb,
  Style,
} from "./modelizer-types";
import Points from "../points";
import { dumpBody, dumpCell, dumpFooter, dumpHeader } from "./dump";

/**
 * Modelizer class needs some datapoints to work. Each datapoint will add
 * a key to #keys.row and #keys.col. All #keys will define the rows and
 * columns of the output table. Rows and columns can be added, removed, sorted
 * and modelized.
 */
export default class Modelizer {
  /**
   * If strict mode is 'true', no rows/columns/keys will be added automatically.
   * In lax mode, any non-existing string passing #parseCellKey will create
   * a new entry, which makes it easy to add new rows or columns.
   */
  strict: boolean;
  /**
   * The parent class for this Modelizer instance
   */
  query: Query;
  /**
   * Stores all keys for the current set of rows and columns.
   * Represents the current edges of result table.
   * @private
   */
  readonly #keys: Keys = {
    row: [],
    column: [],
  };
  /**
   * Stores all Model rows. Each model holds an array of referenced cells and
   * some useful methods to modelize row data.
   * Referenced cells of a row represent its columns.
   * @private
   */
  #rows: Model[] = [];
  /**
   * Stores all Model columns. Each model holds an array of referenced cells and
   * some useful methods to modelize column data.
   * Referenced cells of a column represent its rows.
   * @private
   */
  #columns: Model[] = [];
  /**
   * Stores all Cells. Cells are referenced by rows and columns.
   * @private
   */
  #cells: Cell[] = [];

  constructor(options?: ModelizerOptions, query?: Query) {
    this.strict = options?.strict !== undefined ? options?.strict : true;
    if (options?.points) {
      this.addPoints(options.points);
    }
    this.query = query;
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
    const rowKey = options?.rowKey ? options.rowKey(point) : point.row;
    const colKey = options?.colKey ? options.colKey(point) : point.column;

    const r = this.addRow(rowKey);
    const c = this.addColumn(colKey);
    const cell = this.pushCellPoints(r, c, point);

    if (options?.value) {
      const value = options.value(point);
      cell.setValue(value);
    } else if (cell.value === undefined) {
      cell.setValue(point.value);
    }

    return this;
  }
  /**
   * Apply a callback to each cell of the current table.
   * @returns {this}
   * @param cb The callback to run on each cell
   */
  process(cb: RenderTableCb): this {
    this.getKeys("row").forEach((rowKey, r) => {
      this.getKeys("column").forEach((colKey, c) => {
        const cell = this.getCell(r, c);
        cb(cell, r, c, rowKey, colKey);
      });
    });
    return this;
  }

  /**
   * Pass a callback to run on each row or column by given mode.
   * @param mode KeyMode is either 'row' or 'col'
   * @param cb The callback to run on each row
   */
  processByMode(mode: KeyMode, cb: ProcessRowCb | ProcessColumnCb): this {
    switch (mode) {
      case "row":
        return this.processRows(cb);
      case "column":
        return this.processColumns(cb);
    }
    return this;
  }

  /**
   * Pass a callback to run on each row.
   * @param cb The callback to run on each row
   */
  processRows(cb: ProcessRowCb): this {
    this.getKeys("row").forEach((rowKey, r) => {
      const row = this.getRow(r);
      cb(row, r, rowKey);
    });
    return this;
  }

  /**
   * Pass a callback to run on each column.
   * @param cb The callback to run on each column
   */
  processColumns(cb: ProcessColumnCb): this {
    this.getKeys("column").forEach((colKey, c) => {
      const column = this.getColumn(c);
      cb(column, c, colKey);
    });
    return this;
  }

  /**
   * Retreive the current keys for row or column.
   * @param mode Pass "row" or "col" to specify the target dimension.
   * @returns {string[]} Array of strings containing the keys.
   */
  getKeys(mode: KeyMode): string[] {
    const tmpKeys = this.#getKeys(mode);
    if (Array.isArray(tmpKeys)) {
      return [...this.#getKeys(mode)];
    }
    return [];
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
    return this.#addKey(key, "column");
  }

  #addKey(key: string, mode: KeyMode): number {
    const keys = this.#getKeys(mode);
    if (!keys.includes(key)) {
      this.#addKeyByMode(mode, key);
    }
    return keys.indexOf(key);
  }

  #getKeys(mode: KeyMode): string[] {
    return this.#keys[mode] || [];
  }

  #addKeyByMode(mode, key): void {
    this.#keys[mode].push(key);
  }

  #setKeys(mode: KeyMode, keys: string[]): void {
    this.#keys[mode] = keys;
  }

  #updateKey(mode: KeyMode, index: number, key: string): void {
    if (!this.#keys[mode][index]) {
      this.#handleError("Can't update key at index " + index);
    }
    this.#keys[mode][index] = key;
  }

  #getKey(key: Key, mode: KeyMode): string {
    const id = this.#parseCellKey(key, mode);
    return this.#getKeys(mode)[id];
  }

  setCellValueByMode(mode: KeyMode, k1: Key, k2: Key, value: CellValue): Cell {
    if (mode === "row") {
      return this.setCellValue(k1, k2, value);
    } else {
      return this.setCellValue(k2, k1, value);
    }
  }
  /**
   * Pass a {CellValue} to a target {Cell}.
   * @param r Pass a number or a string to determine the target cell row.
   * @param c Pass a row or column key to target the cell.
   * @param value A string or a number to alter the cell value.
   * @return {Cell}
   */
  setCellValue(r: Key, c: Key, value: CellValue): Cell {
    const targetCell = this.getCell(r, c);
    targetCell.setValue(value);
    return targetCell;
  }

  /**
   * Pass a Datapoint to a target Cell. The point will not change the
   * target cell value.
   * @param r Pass a number or a string to determine the target cell row.
   * @param c Pass a row or column key to target the cell.
   * @param point The point to push the cell's point stack with.
   */
  pushCellPoints(r: Key, c: Key, point: DataPoint): Cell {
    const targetCell = this.getCell(r, c);
    targetCell.points.push(point);
    return targetCell;
  }
  /**
   * Retreive a rows- or columns-model object for the given selector.
   * @param mode Pass 'row' or 'column'.
   * @param key Pass a number or a string to select the target row/column.
   * @return A model row/column object containing all cells.
   */
  getByMode(mode: KeyMode, key: Key): Model {
    if (mode === "row") {
      return this.getRow(key);
    } else {
      return this.getColumn(key);
    }
  }

  getRow(key: Key): Model {
    return this.findOrCreateModel(this.#rows, "row", key);
  }

  getColumn(key: Key): Model {
    return this.findOrCreateModel(this.#columns, "column", key);
  }

  findOrCreateModel(models: Model[], mode: KeyMode, key: Key) {
    const modelKey = this.#getKey(key, mode);
    const existing = models.find((model) => model.key === modelKey);
    if (existing) {
      return existing;
    }

    const model = this.createModel(modelKey, mode);
    models.push(model);
    return model;
  }

  /**
   * Retreive a row or column model object for the given selector.
   * @param key Pass a number or a string to set the target key.
   * @param mode Specify "row" or "column"
   * @return A model object containing all cells.
   */
  createModel(key: string, mode: KeyMode): Model {
    const model: Model = {
      key: key,
      id: () => this.#parseCellKey(key, mode),
      style: this.#style(),
      cells: () => this.#filterCells(mode === "row" ? "column" : "row", key),
      each: (cb: ModelEachCb) => {
        model.cells().forEach((cell) => cb(cell));
        return model;
      },
      collect: (): CellValue[] => {
        const values = [];
        model.each((cell) => {
          values.push(cell.toNumber());
        });
        return values;
      },
      getCell: (i: Key) => this.getCellByMode(mode, model.id(), i),
      setCell: (i: Key, cell: Cell) => {
        this.setCellByMode(mode, model.id(), i, cell);
        return model;
      },
      setCellValue: (i: Key, value: CellValue) => {
        this.setCellValueByMode(mode, model.id(), i, value);
        return model;
      },
      updateKey: (newKey: string) => {
        const targetKey = mode === "row" ? "rowKey" : "columnKey";
        model.cells().forEach((cell) => (cell[targetKey] = newKey));
        this.#updateKey(mode, model.id(), newKey);

        return model;
      },
      dump: (s1, s2) =>
        mode === "row"
          ? this.dump(s1, s2, [model.id()], [])
          : this.dump(s1, s2, [], [model.id()]),
    };
    return model;
  }

  #style = (): Style => {
    const style = {
      state: {},
      assign(style) {
        style.state = {
          ...style.state,
          ...style,
        };
      },
      get() {
        return style.state;
      },
    };
    return style;
  };

  getCellByMode(mode: KeyMode, i1: Key, i2: Key): Cell {
    if (mode === "row") {
      return this.getCell(i1, i2);
    } else {
      return this.getCell(i2, i1);
    }
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
    const colId = this.#parseCellKey(c, "column");

    return this.#findCellByIndex(rowId, colId);
  }

  setCellByMode(mode: KeyMode, k1: Key, k2: Key, cell?: Cell): Cell {
    if (mode === "row") {
      return this.setCell(k1, k2, cell);
    } else {
      return this.setCell(k2, k1, cell);
    }
  }
  /**
   * Update a Cell object at the given keys or create one.
   * In strict mode, Modelizer will throw an error when there are no matching keys.
   * @param rowKey Set a numeric or string value to address the target row
   * @param colKey Set a numeric or string value to address the target column
   * @param cell Optionally set a numeric or string value to address the target column
   * @returns {Cell}
   */
  setCell(rowKey: Key, colKey: Key, cell?: Cell): Cell {
    const r = this.#parseCellKey(rowKey, "row");
    const c = this.#parseCellKey(colKey, "column");

    if (cell) {
      const targetCell = _.cloneDeep(cell);
      if (typeof rowKey === "string") {
        targetCell.rowKey = rowKey;
      }
      if (typeof colKey === "string") {
        targetCell.columnKey = colKey;
      }

      const createdCell = this.#findCellByKeys(
        targetCell.rowKey,
        targetCell.columnKey
      );
      Object.assign(createdCell, targetCell);

      return createdCell;
    }

    return this.#findCellByIndex(r, c);
  }

  #findCellByIndex(r: number, c: number): Cell {
    const rowKey = this.#getKey(r, "row");
    const columnKey = this.#getKey(c, "column");

    if (!rowKey || !columnKey) {
      throw "Valid keys are required to find cell at r: " + r + ", c: " + c;
    }

    return this.#findCellByKeys(rowKey, columnKey);
  }

  #findCellByKeys(rowKey: string, columnKey: string): Cell {
    const existingCell = this.#cells.find(
      (cell) => cell.rowKey === rowKey && cell.columnKey === columnKey
    );

    if (existingCell) {
      return existingCell;
    }

    const createdCell = this.#defaultCell(rowKey, columnKey);

    this.#pushCells(createdCell);

    return createdCell;
  }

  #pushCells(cell: Cell) {
    this.#cells.push(cell);
  }

  #filterCells(mode: KeyMode, key: string): Cell[] {
    const keys = this.getKeys(mode);
    const cells = [];
    keys.forEach((targetKey) => {
      const findOrCreateCell =
        mode === "column"
          ? this.#findCellByKeys(key, targetKey)
          : this.#findCellByKeys(targetKey, key);

      cells.push(findOrCreateCell);
    });
    return cells;
  }

  #parseCellKeys(keys: Key[], mode: KeyMode): number[] {
    if (!keys || keys.map === undefined) return [];
    return keys.map((key) => this.#parseCellKey(key, mode));
  }

  #parseCellKey(key: Key, mode: KeyMode): number {
    const keys = this.#getKeys(mode);

    if (typeof key === "number") {
      if (keys[key]) return key;
      this.#handleError(
        `Key of '${mode}' not found: ${key}. Length is: ${keys.length}`
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
   * @param rowKey
   * @param columnKey
   * @returns Cell
   */
  #defaultCell(rowKey: string, columnKey: string): Cell {
    const cell = {
      value: undefined,
      rowKey: rowKey,
      columnKey: columnKey,
      points: <DataPoint[]>[],
      getPoint: (i?: number) => {
        i = cell.points[i] ? i : 0;
        if (!cell.points || !cell.points[i]) {
          cell.points[i] = Points.dataPointFactory(
            rowKey,
            columnKey,
            [],
            [],
            null
          );
        }
        return cell.points[i];
      },
      getPoints: () => {
        return cell.points;
      },
      addPoint: (point: DataPoint) => {
        cell.points = cell.points || [];
        cell.points.push(point);
      },
      getValue: () => cell.value || cell.getPoint().value,
      setValue: (value: CellValue) => {
        cell.getPoint().value = value;
        cell.value = value;
        return cell;
      },
      getRow: () => this.getRow(rowKey),
      getColumn: () => this.getColumn(columnKey),
      toNumber: () => {
        let currentValue = cell.getValue();
        if (typeof currentValue === "string" && currentValue.includes(",")) {
          currentValue = currentValue.replace(",", ".");
        }
        return Number(currentValue);
      },
      toCell: () => {
        let currentValue = cell.getValue();
        if (
          currentValue === false ||
          currentValue === null ||
          currentValue === undefined ||
          currentValue === ""
        ) {
          return "";
        }
        return cell.toNumber();
      },
      dump: () => dumpCell(cell),
    };

    return cell;
  }

  #filterCellKeys(keys: Key[], mode: KeyMode) {
    const ids = this.#parseCellKeys(keys, mode);
    const allKeys = this.#getKeys(mode);
    return allKeys.filter((key, c) => ids.length === 0 || ids.includes(c));
  }

  getCells() {
    return this.#cells;
  }

  /**
   * Get the first of all DataPoints. This is helpful if you need general tags
   * or meta information and if you can assure that all active datapoints
   * hold the same information as Point zero.
   * @returns {DataPoint}
   */
  getFirstPoint() {
    let firstPoint;
    this.process((cell) => {
      if (firstPoint) {
        return;
      }
      const cellHasPoint = cell.getPoint();
      if (cellHasPoint) {
        firstPoint = cellHasPoint;
      }
    });
    return firstPoint;
  }

  /**
   * Specify "row" or "column" and an array of keys to filter and sort the target
   * dimension of current table.
   * @param mode
   * @param keys
   */
  sort(mode: KeyMode, keys: Key[]): this {
    const ids = this.#parseCellKeys(keys, mode);
    const existingKeys = this.#getKeys(mode);

    const sortedKeys = [];
    ids.forEach((id) => {
      sortedKeys.push(existingKeys[id]);
    });
    this.#setKeys(mode, sortedKeys);

    return this;
  }

  /**
   * Transpose the result by switching rows and columns.
   */
  transpose() {
    const sortRows = this.getKeys("column");
    const sortCols = this.getKeys("row");

    this.process((cell) => {
      const rowKey = cell.rowKey;
      const colKey = cell.columnKey;
      cell.points.forEach((point) => {
        point.row = rowKey;
        point.column = colKey;
      });
      this.setCell(colKey, rowKey, cell);
    });

    this.sort("row", sortRows);
    this.sort("column", sortCols);
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
    renderCell?: (cell: Cell) => any
  ) {
    firstColSize = firstColSize || 15;
    colSize = colSize || 10;

    const rowKeys = this.#filterCellKeys(rows, "row");
    const colKeys = this.#filterCellKeys(cols, "column");

    dumpHeader(firstColSize, colSize, colKeys);
    dumpBody(firstColSize, colSize, rowKeys, colKeys, this.#cells, renderCell);
    dumpFooter(firstColSize, colSize, colKeys);
  }

  #handleError(message: string) {
    throw new Error(message);
  }
}
