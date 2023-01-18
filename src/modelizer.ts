import { DataPoint } from "./types";
import Query from "./query";
import { vd } from "./helper";
import { indexOf } from "lodash";
import TransformResult from "./helper/transformResult";

type Table = Row[];
type Row = Cell[];
type CellValue = string | number | null | undefined;
type Cell = {
  value: CellValue;
  points: DataPoint[];
  getPoint: (i: number) => DataPoint;
  getValue: () => CellValue;
  toNumber: () => number;
};
type Key = string;

type KeyFromCb = (point: DataPoint) => string;
type ValueFromCb = (point: DataPoint) => CellValue;
type RenderTableCb = (
  cell: Cell,
  r: number,
  c: number,
  rowKey: Key,
  colKey: Key
) => void;

export default class Modelizer {
  points: DataPoint[] = [];
  table: Table = [];
  rowKeys: Key[] = [];
  colKeys: Key[] = [];

  constructor() {
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

  addKey(key: string, mode: "row" | "col"): number {
    const from = mode + "Keys";
    if (!this[from].includes(key)) {
      this[from].push(key);
    }
    return this[from].indexOf(key);
  }

  setCellValue(r, c, value: CellValue): Cell {
    const targetCell = this.getCell(r, c);
    targetCell.value = value;
    return targetCell;
  }

  pushCellPoints(r, c, point: DataPoint): Cell {
    const targetCell = this.getCell(r, c);
    targetCell.points.push(point);
    return targetCell;
  }

  getCell(r, c): Cell {
    this.table[r] = this.table[r] || [];
    this.table[r][c] = this.table[r][c] || this.defaultCell();

    return this.table[r][c];
  }

  defaultCell(): Cell {
    const cell = {
      value: undefined,
      points: <DataPoint[]>[],
      getPoint: (i) => {
        return cell.points[i] || TransformResult.createDataPoint();
      },
      getValue: () => cell.value || cell.getPoint(0).value,
      toNumber: () => Number(cell.getValue()),
    };

    return cell;
  }

  dump(firstColSize?: number, colSize?: number, renderCell?) {
    firstColSize = firstColSize || 10;
    colSize = colSize || 8;

    let header = this.toColSize("", firstColSize);
    this.colKeys.forEach((colKey, c) => {
      header = header + this.toColSize(colKey, colSize);
    });
    console.log(header);

    this.rowKeys.forEach((rowKey, r) => {
      let row = this.toColSize(rowKey, firstColSize);
      this.colKeys.forEach((colKey, c) => {
        const cell = this.getCell(r, c);
        const value = renderCell ? renderCell(cell) : cell.value;
        row = row + this.toColSize(value, colSize);
      });
      console.log(row);
    });
  }

  toColSize(s: string | number, size: number): string {
    let content = String(s);
    const right = size - content.length;
    if (right > 0) {
      for (let i = 0; i <= right; i++) {
        content = content + " ";
      }
      return content;
    }

    return content.slice(0, size + 1);
  }
}
