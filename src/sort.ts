import { ResultRow } from "./types/types";

export const byColId = (colId: number) => {
  return (a: ResultRow, b: ResultRow) => {
    return Number(b.cols[colId].value) - Number(a.cols[colId].value);
  };
};
