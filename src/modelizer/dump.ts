/**
 * Log contents of the current cell to console.
 * @param cell
 * @private
 */
import { Cell } from "./modelizer-types";
import { vd } from "../helper";

export const dumpCell = (cell: Cell): void => {
  const contents = {
    value: cell.value,
    row: cell.rowKey,
    column: cell.columnKey,
    points: cell.getPoints().map((point) => {
      return {
        value: point.value,
        meta: point.getMetas(),
        tags: point.tags,
      };
    }),
  };
  console.log(contents);
};

export const dumpHeader = (
  firstColSize: number,
  colSize: number,
  colKeys: string[]
) => {
  console.log();
  let header = toColSize("", firstColSize);
  colKeys.forEach((colKey, c) => {
    header = header + toColSize(colKey, colSize);
  });
  console.log(header);
};

export const dumpBody = (
  firstColSize: number,
  colSize: number,
  rowKeys: string[],
  colKeys: string[],
  cells: Cell[],
  renderCell
) => {
  rowKeys.forEach((rowKey, r) => {
    let row = toColSize(rowKey, firstColSize);
    colKeys.forEach((colKey, c) => {
      const cell = cells.find(
        (cell) => cell.rowKey === rowKey && cell.columnKey === colKey
      );

      let value = "-";
      if (cell) {
        value = renderCell ? renderCell(cell) : cell.getValue();
      }

      row = row + toColSize(value, colSize);
    });
    console.log(row);
  });
};

export const dumpFooter = (
  firstColSize: number,
  colSize: number,
  colKeys: string[]
) => {
  const line = toColSize("-", firstColSize + colSize * colKeys.length, "-");
  console.log(line);
};

export const toColSize = (
  s: string | number,
  size: number,
  fill?: string
): string => {
  fill = fill || " ";
  let content = String(s);
  const right = size - content.length;
  if (right >= 0) {
    for (let i = 0; i <= right; i++) {
      content = content + fill;
    }
    return content;
  }

  return content.slice(0, size + 1);
};
