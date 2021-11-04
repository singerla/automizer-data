import { vd } from './helper';
import {DataPoint, DataPointTarget, RenameLabel} from './types';
import {
  ModArgsFilter,
  ModArgsStringTolabel,
  ModArgsTagTolabel,
  ModArgsAddToOthers,
  ModArgsAddMeta,
  ModArgsMap,
  ModArgsRename
} from './types';

export default class Points {
  points: DataPoint[];

  constructor(points:DataPoint[]) {
    this.points = points
  }

  targetPoints(points?:DataPoint[]): DataPoint[] {
    if(points !== undefined) {
      return points
    }
    return this.points
  }

  filter(args: ModArgsFilter): DataPoint[] {
    const {key, values, replace} = args
    if((key === 'row' || key === 'column')
      && Array.isArray(values) && values.length) {
      const points = this.points.filter(point => values.includes(point[key]))

      if(replace === true) {
        this.replace(points)
      }
      return points
    }
    return this.points
  }

  addStringToLabel(args: ModArgsStringTolabel, points?:DataPoint[]): void {
    const {value, target} = args
    this.targetPoints(points).forEach(point => {
      point[target] += value
    })
  }

  addTagToLabel(args: ModArgsTagTolabel, points?:DataPoint[]): void {
    const {categoryId, target} = args
    const glue = (!args.glue) ? ' ' : args.glue

    this.targetPoints(points).forEach(point => {
      const tag = point.tags.find(tag => tag.categoryId === categoryId)
      const value = (tag?.value) ? tag?.value : 'n/a'
      point[target] += glue + value
    })
  }

  addToOthers(args: ModArgsAddToOthers, points:DataPoint[]): DataPoint[] {
    const {match} = args

    const insert = (match==='row') ? 'column' : 'row'
    const addTo = <DataPoint[]>[]
    points.forEach(addPoint => {
      this.points.forEach(point => {
        if(addPoint[match] === point[match] && addPoint[insert] !== point[insert]) {
          const addToPoints = <DataPoint> {...addPoint}
          addToPoints[insert] = point[insert]
          addTo.push(addToPoints)
        }
      })
    })

    this.push(addTo)
    return addTo
  }

  addMeta(args: ModArgsAddMeta, points?:DataPoint[]): void {
    const {key} = args
    const glue = (!args.glue) ? ' ' : args.glue

    this.targetPoints(points).forEach(point => {
      const targetMeta = point.meta?.find(meta => meta.key === key)
      if(targetMeta && targetMeta.value) {
        point.value += String(glue) + targetMeta.value
      }
    })
  }

  map(args: ModArgsMap, points?:DataPoint[]): void {
    const {categoryId, target} = args
    this.targetPoints(points).forEach(point => {
      const tag = point.tags.find(tag => tag.categoryId === categoryId)
      point[target] = (tag?.value) ? tag?.value : 'n/a'
    })
  }

  rename(args: ModArgsRename, points?:DataPoint[]): void {
    const {renameStack} = args
    this.targetPoints(points).forEach(point => {
      renameStack.forEach(rename => {
        if(rename.isPattern && rename.isPattern === true) {
          rename.cb = (label: string): string => {
            const regExp = new RegExp(rename.replace)
            return label.replace(regExp, rename.by)
          }
        }
        let targets = this.getRenameTargets(rename)
        this.applyRenameLabel(targets, rename, point)
      })
    })
  }

  getRenameTargets(rename: RenameLabel): DataPointTarget[] {
    let targets = <DataPointTarget[]>[]
    if(rename.target) {
      targets.push(rename.target)
    }
    if(rename.targets) {
      targets = rename.targets
    }
    return targets
  }

  applyRenameLabel(targets: DataPointTarget[], rename: RenameLabel, point: DataPoint) {
    targets.forEach(target => {
      if(rename.cb) {
        point[target] = rename.cb(point[target])
      } else if(rename.replace && rename.by) {
        if(point[target] && point[target] === rename.replace) {
          point[target] = rename.by
        }
      }
    })
  }

  replace(replaceBy:DataPoint[]): void {
    this.points.length = 0
    this.push(replaceBy)
  }

  push(addPoints:DataPoint[]) {
    this.points.push(...addPoints)
  }

  dump(points?:DataPoint[]) {
    vd(this.targetPoints(points))
  }
}
