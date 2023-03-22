import { vd } from "./helper";
import {
  AggregatePoints,
  DataPoint,
  DataPointMeta,
  DataPointTarget,
  ModArgsAddToNew,
  ModArgsCalcDifference,
  ModArgsCalcSum,
  ModArgsExclude,
  ModArgsFilterNested,
  NestedParentValue,
  RenameLabel,
  ResultCell,
} from "./types/types";
import {
  ModArgsFilter,
  ModArgsStringTolabel,
  ModArgsTagTolabel,
  ModArgsAddToOthers,
  ModArgsAddMeta,
  ModArgsMap,
  ModArgsRename,
  ModArgsTranspose,
} from "./types/types";
import TransformResult from "./helper/transformResult";

export default class Points {
  points: DataPoint[];

  constructor(points: DataPoint[]) {
    this.points = points;
  }

  targetPoints(points?: DataPoint[]): DataPoint[] {
    if (points !== undefined) {
      return points;
    }
    return this.points;
  }

  filter(args: ModArgsFilter): DataPoint[] {
    const { key, values, replace, origin } = args;
    if (Array.isArray(values) && values.length) {
      let points;
      if (key === "row" || key === "column") {
        points = this.points.filter((point) => {
          const targetPoint = this.getTargetPoint(point, origin);
          return values.includes(targetPoint[key]);
        });
      } else {
        points = this.points.filter((point) => {
          const targetPoint = this.getTargetPoint(point, origin);
          return targetPoint.tags.find(
            (tag) =>
              tag.categoryId === Number(key) && values.includes(tag.value)
          );
        });
      }

      if (replace === true) {
        this.replace(points);
      }
      return points;
    }
    return this.points;
  }

  getTargetPoint(point: DataPoint, origin?: boolean): DataPoint {
    if (origin === true) {
      if (point.origin && point.origin[0]) return point.origin[0];
    }
    return point;
  }

  createDataPoint(
    rowKey?: string,
    colKey?: string,
    value?: ResultCell
  ): DataPoint {
    return TransformResult.createDataPoint(rowKey, colKey, value);
  }

  exclude(args: ModArgsExclude): void {
    const { key, values, excludeAll, gate } = args;

    let points = <DataPoint[]>[];
    if (key === "row" || key === "column") {
      if (values.length) {
        points = this.points.filter((point) => !values.includes(point[key]));
      }
    } else {
      if (excludeAll !== true) {
        if (gate && typeof gate === "number") {
          points = this.points.filter((point) => Number(point.value) >= gate);
        } else {
          points = this.points.filter((point) =>
            point.tags.find(
              (tag) =>
                tag.categoryId === Number(key) && !values.includes(tag.value)
            )
          );
        }
      } else {
        points = this.points.filter((point) => {
          return !point.tags.find((tag) => tag.categoryId === Number(key));
        });
      }
    }

    this.replace(points);
  }

  addStringToLabel(args: ModArgsStringTolabel, points?: DataPoint[]): void {
    const { value, target } = args;
    this.targetPoints(points).forEach((point) => {
      this.pushPointOrigin(point);
      point[target] += value;
    });
  }

  addTagToLabel(args: ModArgsTagTolabel, points?: DataPoint[]): void {
    const { categoryId, target } = args;
    const glue = !args.glue ? " " : args.glue;

    this.targetPoints(points).forEach((point) => {
      this.pushPointOrigin(point);
      const tag = point.tags.find((tag) => tag.categoryId === categoryId);
      const value = tag?.value ? tag?.value : "n/a addTagToLabel";
      point[target] += glue + value;
    });
  }

  map(args: ModArgsMap, points?: DataPoint[]): void {
    const { source, target } = args;
    this.targetPoints(points).forEach((point) => {
      this.pushPointOrigin(point);
      if (source === "row" || source === "column") {
        point[target] = point[source];
      } else {
        const tag = point.tags.find((tag) => tag.categoryId === source);
        point[target] = tag?.value ? tag?.value : "n/a map";
      }
    });
  }

  rename(args: ModArgsRename, points?: DataPoint[]): void {
    const { renameStack } = args;
    this.targetPoints(points).forEach((point) => {
      this.pushPointOrigin(point);
      renameStack.forEach((rename) => {
        if (rename.isPattern && rename.isPattern === true) {
          rename.cb = (label: string): string => {
            const regExp = new RegExp(rename.replace);
            return label.replace(regExp, rename.by);
          };
        }
        let targets = this.getRenameTargets(rename);
        this.applyRenameLabel(targets, rename, point);
      });
    });
  }

  getRenameTargets(rename: RenameLabel): DataPointTarget[] {
    let targets = <DataPointTarget[]>[];
    if (rename.target) {
      targets.push(rename.target);
    }
    if (rename.targets) {
      targets = rename.targets;
    }
    return targets;
  }

  applyRenameLabel(
    targets: DataPointTarget[],
    rename: RenameLabel,
    point: DataPoint
  ) {
    targets.forEach((target) => {
      if (rename.cb) {
        point[target] = rename.cb(point[target]);
      } else if (rename.replace && rename.by) {
        if (point[target] && point[target] === rename.replace) {
          point[target] = rename.by;
        }
      }
      if (rename.ucFirst) {
        point[target] = point[target][0].toUpperCase() + point[target].slice(1);
      }
    });
  }

  replace(replaceBy: DataPoint[]): void {
    this.points.length = 0;
    this.push(replaceBy);
  }

  push(addPoints: DataPoint[]) {
    this.points.push(...addPoints);
  }

  pushPointOrigin(point: DataPoint) {
    point.origin = !point.origin
      ? [{ ...point }]
      : [...point.origin, { ...point }];
  }

  dump(points?: DataPoint[]) {
    vd(this.targetPoints(points));
  }
}
