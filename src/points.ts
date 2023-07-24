import { vd } from "./helper";
import {
  DataPoint,
  DataPointMeta,
  DataPointTarget,
  Datasheet,
  DataTag,
  ModArgsExclude,
  ModArgsFilter,
  ModArgsMap,
  ModArgsRename,
  ModArgsStringTolabel,
  ModArgsTagTolabel,
  NestedParentValue,
  RawResultMeta,
  RenameLabel,
} from "./types/types";
import { CellValue, InputKeys } from "./modelizer/modelizer-types";

import _ from "lodash";

export default class Points {
  points: DataPoint[];

  constructor(points: DataPoint[]) {
    this.points = points;
  }

  static dataPointFactory(
    rowKey?: string,
    colKey?: string,
    tags?: DataTag[],
    meta?: DataPointMeta[],
    value?: CellValue
  ) {
    const point = <DataPoint>{
      row: rowKey,
      column: colKey,
      value: value,
      tags: tags,
      meta: meta,
      getMetas: () => point.meta,
      setMeta: (key: string, value: any): DataPoint =>
        Points.setMetaCb(point, key, value),
      getMeta: (key: string): DataPointMeta | undefined =>
        Points.getMetaCb(point, key),
      getTag: (categoryId: number): DataTag | undefined =>
        Points.getTagCb(point, categoryId),
    };

    return point;
  }

  static getMetaCb(point: DataPoint, key: string): DataPointMeta | undefined {
    if (point.meta) {
      return point.meta.find((meta) => meta.key === key);
    }
  }

  static setMetaCb(point: DataPoint, key: string, value): DataPoint {
    point.meta.push({
      key: key,
      value: value,
    });
    return point;
  }

  static getTagCb(point: DataPoint, categoryId: number): DataTag | undefined {
    if (point.tags) {
      return (
        point.tags.find((meta) => meta.categoryId === categoryId) || {
          value: undefined,
          category: undefined,
          categoryId: categoryId,
          id: undefined,
        }
      );
    }
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
          return values.includes(point[key]);
        });
      } else {
        points = this.points.filter((point) => {
          return point.tags.find(
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
    const targetLabelKey = target;

    this.targetPoints(points).forEach((point) => {
      point[targetLabelKey] = point[target] + value;
    });
  }

  addTagToLabel(args: ModArgsTagTolabel, points?: DataPoint[]): void {
    const { categoryId, target } = args;
    const glue = !args.glue ? " " : args.glue;
    const targetLabelKey = target;

    this.targetPoints(points).forEach((point) => {
      const tag = point.tags.find((tag) => tag.categoryId === categoryId);
      const value = tag?.value ? tag?.value : "n/a addTagToLabel";

      point[targetLabelKey] = point[target] + glue + value;
    });
  }

  map(args: ModArgsMap, points?: DataPoint[]): void {
    const { source, target } = args;
    this.targetPoints(points).forEach((point) => {
      let targetValue = "n/a map";
      if (source === "row" || source === "column") {
        targetValue = point[source];
      } else {
        const tag = point.tags.find((tag) => tag.categoryId === source);
        targetValue = tag?.value ? tag?.value : "n/a map";
      }
      point.setMeta("mapOrigin", {
        row: point.row,
        column: point.column,
        mapping: target,
        targetValue: targetValue,
      });
      point[target] = targetValue;
    });
  }

  rename(args: ModArgsRename, points?: DataPoint[]): void {
    const { renameStack } = args;
    this.targetPoints(points).forEach((point) => {
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

  dump(points?: DataPoint[]) {
    vd(this.targetPoints(points));
  }

  static getDataPointMeta(
    sheet: Datasheet,
    r: number,
    c: number
  ): DataPointMeta[] {
    const pointMeta = <DataPointMeta[]>[];

    sheet.meta.forEach((metaContent: RawResultMeta) => {
      if (metaContent?.key === "nested") {
        Points.pushPointNestedMeta(metaContent, pointMeta, sheet, r, c);
      } else if (metaContent?.data) {
        if (Points.metaHasRows(metaContent?.data)) {
          Points.pushPointMeta(
            pointMeta,
            metaContent.key,
            metaContent.data[r][c]
          );
        } else {
          Points.pushPointMeta(pointMeta, metaContent.key, metaContent.data[c]);
        }
      }

      if (metaContent?.info && metaContent.label === sheet.rows[r]) {
        this.pushPointInfo(metaContent, pointMeta, sheet, r, c);
      }
    });

    return pointMeta;
  }

  static pushPointInfo(
    metaContent: RawResultMeta,
    pointMeta: DataPointMeta[],
    sheet: Datasheet,
    r: number,
    c: number
  ) {
    const hasMetaContent = metaContent.info?.find(
      (meta) => meta.value === sheet.columns[c]
    );
    if (hasMetaContent && hasMetaContent.info) {
      Points.pushPointMeta(pointMeta, hasMetaContent.info, hasMetaContent.key);
    }
  }

  static pushPointNestedMeta(
    metaContent: RawResultMeta,
    pointMeta: DataPointMeta[],
    sheet: any,
    r: number,
    c: number
  ) {
    if (metaContent.label === sheet.rows[r]) {
      const parentValues = <NestedParentValue[]>[];
      metaContent.data.forEach((parentLabel) => {
        const parentRow = sheet.rows.indexOf(parentLabel);
        parentValues.push({
          label: parentLabel,
          value: sheet.data[parentRow][c],
        });
        if (parentLabel === metaContent.label) {
          Points.pushPointMeta(pointMeta, "isParent", true);
        } else {
          Points.pushPointMeta(pointMeta, "isChild", true);
        }
      });
      Points.pushPointMeta(pointMeta, metaContent.key, parentValues);
    }
  }

  static metaHasRows(metaData: any): boolean {
    return metaData[0] && Array.isArray(metaData[0]);
  }

  static pushPointMeta(pointMeta: DataPointMeta[], key: string, value: any) {
    pointMeta.push({
      key: key,
      value: value,
    });
  }
}
