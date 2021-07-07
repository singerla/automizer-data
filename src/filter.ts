import { DataGridFunction, DataPoint, DataPointFilter, DataTag } from "./types"

export const filterByDataTag = <DataGridFunction> function(targetTag: DataTag): DataPointFilter {
  return (points: DataPoint[]): DataPoint[] => points.filter(
    (point: DataPoint) => point.tags.find(
      (tag: DataTag) => tag.value === targetTag.value))
}
  
export const filterByRow = <DataGridFunction> function(targetRow: string): DataPointFilter {
  return (points: DataPoint[]): DataPoint[] => points.filter(
      (point: DataPoint) => point.row === targetRow)
}

export const filterByColumn = <DataGridFunction> function(targetColumn: string): DataPointFilter {
  return (points: DataPoint[]): DataPoint[] => points.filter(
      (point: DataPoint) => point.column === targetColumn)
}
  