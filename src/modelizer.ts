import { DataPoint } from "./types";
import TransformResult from "./helper/transformResult";

type Table = Row[];
type Row = Cell[];
type Column = Cell[];
type CellValue = string | number | null | undefined;
type Key = string | number;
type KeyMode = "row" | "col";

type Cell = {
  value: CellValue;
  row: number;
  col: number;
  points: DataPoint[];
  getPoint: (i: number) => DataPoint;
  getValue: () => CellValue;
  setValue: (value: CellValue) => void;
  getRow: () => ModelRow;
  getColumn: () => ModelColumn;
  toNumber: () => number;
};
type ModelRow = {
  cells: Row;
  getCell: (c: Key) => Cell;
  setCellValue: (c: Key, cellValue: CellValue) => ModelRow;
  setCell: (c: Key, cell: Cell) => ModelRow;
  dump: (s1?: number, s2?: number) => void;
};
type ModelColumn = {
  cells: Column;
  getCell: (r: Key) => Cell;
  setCellValue: (r: Key, cellValue: CellValue) => ModelColumn;
  setCell: (r: Key, cell: Cell) => ModelColumn;
  dump: (s1?: number, s2?: number) => void;
};
type KeyFromCb = (point: DataPoint) => string;
type ValueFromCb = (point: DataPoint) => CellValue;
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
  points: DataPoint[] = [];
  table: Table = [];
  rowKeys: string[] = [];
  colKeys: string[] = [];
  strict: boolean;

  constructor(strict?: boolean) {
    this.strict = strict;
    this.rowKeys = [];
    this.colKeys = [];
  }

  render(cb: RenderTableCb): this {
    this.rowKeys.forEach((rowKey, r) => {
      this.colKeys.forEach((colKey, c) => {
        const cell = this.getCell(r, c);
        cb(cell, r, c, rowKey, colKey);
      });
    });
    return this;
  }

  exportKeys(mode: KeyMode): string[] {
    return [...this.getKeys(mode)];
  }

  processRows(cb: ProcessRowCb): this {
    this.rowKeys.forEach((rowKey, r) => {
      const row = this.getRow(r);
      cb(row, r, rowKey);
    });
    return this;
  }

  processColumns(cb: ProcessColumnCb): this {
    this.colKeys.forEach((colKey, c) => {
      const column = this.getColumn(c);
      cb(column, c, colKey);
    });
    return this;
  }

  process(cb): this {
    cb(this);
    return this;
  }

  addPoints(
    points: DataPoint[],
    rowKeyFrom: KeyFromCb,
    colKeyFrom: KeyFromCb,
    valueFrom?: ValueFromCb
  ): this {
    points.forEach((point) => {
      this.addPoint(point, rowKeyFrom, colKeyFrom, valueFrom);
    });
    return this;
  }

  addPoint(
    point: DataPoint,
    rowKeyFrom: KeyFromCb,
    colKeyFrom: KeyFromCb,
    valueFrom?: ValueFromCb
  ): this {
    const rowKey = rowKeyFrom(point);
    const colKey = colKeyFrom(point);

    const r = this.addRow(rowKey);
    const c = this.addColumn(colKey);

    this.pushCellPoints(r, c, point);

    if (valueFrom) {
      const value = valueFrom(point);
      this.setCellValue(r, c, value);
    }

    return this;
  }

  addRow(key: string): number {
    return this.addKey(key, "row");
  }

  addColumn(key: string): number {
    return this.addKey(key, "col");
  }

  addKey(key: string, mode: KeyMode): number {
    const keys = this.getKeys(mode);
    if (!keys.includes(key)) {
      this.addKeyByMode(mode, key);
    }
    return keys.indexOf(key);
  }

  getKeyName(mode: KeyMode): string {
    return mode + "Keys";
  }

  private getKeys(mode): string[] {
    const from = this.getKeyName(mode);
    return this[from];
  }

  private addKeyByMode(mode, key): void {
    const from = this.getKeyName(mode);
    this[from].push(key);
  }

  setCellValue(r: Key, c: Key, value: CellValue): Cell {
    const targetCell = this.getCell(r, c);
    targetCell.value = value;
    return targetCell;
  }

  pushCellPoints(r, c, point: DataPoint): Cell {
    const targetCell = this.getCell(r, c);
    targetCell.points.push(point);
    return targetCell;
  }

  getRow(r: Key): ModelRow {
    const rowId = this.parseCellKey(r, "row");
    return {
      cells: this.table[rowId],
      getCell: (c: Key) => this.getCell(r, c),
      setCell: (c: Key, cell: Cell) => this.setCell(r, c, cell).getRow(),
      setCellValue: (c: Key, value: CellValue) =>
        this.setCellValue(r, c, value).getRow(),
      dump: (s1, s2) => this.dump(s1, s2, [r], []),
    };
  }

  getColumn(c): ModelColumn {
    const colId = this.parseCellKey(c, "col");
    const column = this.getColumnCells(colId);
    return {
      cells: column,
      getCell: (r: number) => this.getCell(r, c),
      setCell: (r: number, cell: Cell) => this.setCell(r, c, cell).getColumn(),
      setCellValue: (r: number, value: CellValue) =>
        this.setCellValue(r, c, value).getColumn(),
      dump: (s1, s2) => this.dump(s1, s2, [], [c]),
    };
  }

  getColumnCells(c: number) {
    return this.rowKeys.map((rowKey, r) => this.getCell(r, c));
  }

  getCell(r: Key, c: Key): Cell {
    const rowId = this.parseCellKey(r, "row");
    const colId = this.parseCellKey(c, "col");

    this.initializeCell(rowId, colId);

    return this.table[rowId][colId];
  }

  setCell(rowKey: Key, colKey: Key, cell: Cell): Cell {
    const r = this.parseCellKey(rowKey, "row");
    const c = this.parseCellKey(colKey, "row");

    this.initializeCell(r, c);
    this.table[r][c] = cell;

    return this.table[r][c];
  }

  private initializeCell(r: number, c: number): void {
    this.initializeRow(r);
    this.table[r][c] = this.table[r][c] || this.defaultCell(r, c);
  }

  private initializeRow(r: number): void {
    this.table[r] = this.table[r] || [];
  }

  private parseCellKeys(keys: Key[], mode: KeyMode): number[] {
    if (!keys) return [];
    return keys.map((key) => this.parseCellKey(key, mode));
  }

  private parseCellKey(key: Key, mode: KeyMode): number {
    const keys = this.getKeys(mode);

    if (typeof key === "number") {
      if (keys[key]) return key;
      this.handleError(
        `Key of '${mode}' not found: ${key}. Length is keys are: ${keys.length}`
      );
    }

    if (typeof key === "string") {
      const index = keys.indexOf(key);
      if (index < 0) {
        return this.createOrFailKey(key, mode, keys);
      }
      return index;
    }

    this.handleError(`Could not determine '${mode}' key: ${key}`);
  }

  private createOrFailKey(key: string, mode: KeyMode, keys: string[]) {
    if (this.strict) {
      const available = keys.join(" | ");
      const message = `Key of '${mode}' not found: ${key}. Available keys are: ${available}`;
      this.handleError(message);
    } else {
      this.addKey(key, mode);
      return this.parseCellKey(key, mode);
    }
  }

  private defaultCell(r: number, c: number): Cell {
    const cell = {
      value: undefined,
      row: r,
      col: c,
      points: <DataPoint[]>[],
      getPoint: (i) => {
        return cell.points[i] || TransformResult.createDataPoint();
      },
      getValue: () => cell.value || cell.getPoint(0).value,
      setValue: (value: CellValue) => (cell.value = value),
      getRow: () => this.getRow(cell.row),
      getColumn: () => this.getColumn(cell.col),
      toNumber: () => Number(cell.getValue()),
    };

    return cell;
  }

  private filterCellKeys(keys: Key[], mode: KeyMode) {
    const ids = this.parseCellKeys(keys, mode);
    const allKeys = this.getKeys(mode);
    return allKeys.filter((key, c) => ids.length === 0 || ids.includes(c));
  }

  sort(mode: KeyMode, keys: Key[]): this {
    const ids = this.parseCellKeys(keys, mode);
    const existingKeys = this.getKeys(mode);
    const keyName = this.getKeyName(mode);

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

    const rowKeys = this.filterCellKeys(rows, "row");
    const colKeys = this.filterCellKeys(cols, "col");

    this.dumpHeader(firstColSize, colSize, colKeys);
    this.dumpBody(firstColSize, colSize, rowKeys, colKeys, renderCell);
    this.dumpFooter(firstColSize, colSize, colKeys);

    this.strict = strict;
  }

  private dumpHeader(firstColSize: number, colSize: number, colKeys: string[]) {
    console.log();
    let header = this.toColSize("", firstColSize);
    colKeys.forEach((colKey, c) => {
      header = header + this.toColSize(colKey, colSize);
    });
    console.log(header);
  }

  private dumpBody(
    firstColSize: number,
    colSize: number,
    rowKeys: string[],
    colKeys: string[],
    renderCell
  ) {
    rowKeys.forEach((rowKey, r) => {
      let row = this.toColSize(rowKey, firstColSize);
      colKeys.forEach((colKey, c) => {
        const cell = this.getCell(rowKey, colKey);
        const value = renderCell ? renderCell(cell) : cell.getValue();
        row = row + this.toColSize(value, colSize);
      });
      console.log(row);
    });
  }

  private dumpFooter(firstColSize: number, colSize: number, colKeys: string[]) {
    const line = this.toColSize(
      "-",
      firstColSize + colSize * colKeys.length,
      "-"
    );
    console.log(line);
  }

  private toColSize(s: string | number, size: number, fill?: string): string {
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

  private handleError(message: string) {
    throw new Error(message);
  }
}
