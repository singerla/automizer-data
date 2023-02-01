import {
  DataPoint,
  Result,
  ResultCell,
  ResultColumn,
  ResultRow,
} from "../types/types";
import { vd } from "../helper";

export default class ResultInfo {
  result: Result;

  constructor(result: Result) {
    this.result = result;
  }

  rowCount(): number {
    return this.result.body.length;
  }

  rowKeys(): string[] {
    return this.result.body.map((row) => row.key);
  }

  getRowKeys() {
    return this.result.body.map((row: any) => row.key);
  }

  getColumnKeys() {
    if (!this.result.body[0]) return [];
    return this.result.body[0].cols.map((col) => col.key);
  }

  getPoint = (rowId: number, colId: number, valueId?: number): DataPoint => {
    const row = this.getRow(rowId);
    const column = this.getColumn(row, colId);
    return this.getValue(column, valueId) as DataPoint;
  };

  getRow = (rowId: number): ResultRow => {
    return this.result.body[rowId];
  };

  getColumn = (row: ResultRow, colId: number): ResultColumn | undefined => {
    if (row && row.cols) {
      return row.cols[colId];
    }
  };

  getValue = (
    column: ResultColumn | undefined,
    valueId?: number
  ): DataPoint | ResultCell | undefined => {
    if (!column || !column.value) {
      return;
    } else if (Array.isArray(column.value)) {
      valueId = valueId || 0;
      return column.value[valueId];
    } else {
      return column.value;
    }
  };

  getMeta = (point: DataPoint, key: string): any => {
    if (point && point.meta) {
      const matchMeta = point.meta.filter((meta) => meta.key === key);
      if (matchMeta.length === 1) {
        return matchMeta[0].value;
      }
      return matchMeta;
    }
  };

  hasMeta = (point: DataPoint, key: string): any => {
    const hasMeta = this.getMeta(point, key);
    return (
      typeof hasMeta === "string" ||
      hasMeta === true ||
      (Array.isArray(hasMeta) && hasMeta.length) > 0
    );
  };

  getTag = (point: DataPoint, categoryId: number): any => {
    if (point && point.tags) {
      return point.tags.find((tag) => tag.categoryId === categoryId);
    }
  };
}
