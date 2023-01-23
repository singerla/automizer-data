import { vd } from "./helper";
import { DataPoint, DataTag, ResultCell, ResultCellInfo } from "./types/types";

export const value = (params: any) => {
  return (points: DataPoint[]): DataPoint[] => {
    const args = params.args;
    if (!args || !args.mode) {
      return points;
    }

    const from = args.mode;
    const targetItems = args.targetItems ? args.targetItems : [];
    const targetPoints = points.filter(
      (point: any) => targetItems.indexOf(point[from]) > -1
    );

    return targetPoints;
  };
};

export const points = (points: DataPoint[]): DataPoint[] => points;

export const dump = (points: DataPoint[]): DataPoint[] => {
  console.dir(points, { depth: 10 });
  if (!points.length) {
    return undefined;
  }

  return points;
};

export const renderPoints = (points: DataPoint[]): ResultCell => {
  return points.map((point) => point.value).join("|");
};
