import { vd } from './helper';
import {
  AggregatePoints,
  DataPoint,
  DataPointTarget,
  ModArgsAddToNew,
  ModArgsCalcDifference,
  ModArgsCalcSum,
  RenameLabel
} from './types';
import {
  ModArgsFilter,
  ModArgsStringTolabel,
  ModArgsTagTolabel,
  ModArgsAddToOthers,
  ModArgsAddMeta,
  ModArgsMap,
  ModArgsRename,
  ModArgsTranspose
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
    if(Array.isArray(values) && values.length) {
      let points
      if(key === 'row' || key === 'column') {
        points = this.points.filter(point => values.includes(point[key]))
      } else {
        points = this.points.filter(point => point.tags.find(
          tag => tag.categoryId === Number(key) && values.includes(tag.value)
        ))
      }

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
      this.pushPointOrigin(point)
      point[target] += value
    })
  }

  addTagToLabel(args: ModArgsTagTolabel, points?:DataPoint[]): void {
    const {categoryId, target} = args
    const glue = (!args.glue) ? ' ' : args.glue

    this.targetPoints(points).forEach(point => {
      this.pushPointOrigin(point)
      const tag = point.tags.find(tag => tag.categoryId === categoryId)
      const value = (tag?.value) ? tag?.value : 'n/a'
      point[target] += glue + value
    })
  }

  addToOthers(args: ModArgsAddToOthers, points:DataPoint[]): DataPoint[] {
    const {match, mode} = args

    const insert = (match==='row') ? 'column' : 'row'
    const addTo = <DataPoint[]>[]
    points.forEach(addPoint => {
      this.points.forEach(point => {
        if(addPoint[match] === point[match] && addPoint[insert] !== point[insert]) {
          const addToPoints = <DataPoint> {...addPoint}
          addToPoints[insert] = point[insert]
          addToPoints.mode = mode
          addTo.push(addToPoints)
        }
      })
    })

    this.push(addTo)
    return addTo
  }

  addToNew(args: ModArgsAddToNew, points:DataPoint[]): void {
    const {key, values, alias, mode} = args

    points.forEach((point, index) => {
      this.pushPointOrigin(point)
      const newPoint = {...point}
      newPoint[key] = alias
      newPoint.mode = mode
      this.points.push(newPoint)
    })
  }

  addMeta(args: ModArgsAddMeta, points?:DataPoint[]): void {
    const {key} = args

    const replacePoints = <DataPoint[]>[]
    this.targetPoints(points).forEach(point => {
      this.pushPointOrigin(point)
      const targetMeta = point.meta?.find(meta => meta.key === key)
      if(targetMeta && targetMeta.value) {
        if(args.glue) {
          point.value += String(args.glue) + targetMeta.value
        } else if(args.replace) {
          point.value = targetMeta.value
          point.row = targetMeta.key
          this.pushUnique(replacePoints, point)
        } else {
          point.value = targetMeta.value
        }
      }
    })

    if(replacePoints.length) {
      this.replace(replacePoints)
    }
  }

  pushUnique(points:DataPoint[], point:DataPoint) {
    const existing = points.find(existingPoint => 
      existingPoint.row === point.row
      && existingPoint.column === point.column)
    
    if(!existing) {
      points.push(point)
    }
  }

  map(args: ModArgsMap, points?:DataPoint[]): void {
    const {source, target} = args
    this.targetPoints(points).forEach(point => {
      this.pushPointOrigin(point)
      if(source === 'row' || source === 'column') {
        point[target] = point[source]
      } else {
        const tag = point.tags.find(tag => tag.categoryId === source)
        point[target] = (tag?.value) ? tag?.value : 'n/a'
      }
    })
  }

  transpose(args: ModArgsTranspose, points?:DataPoint[]): void {
    this.targetPoints(points).forEach(point => {
      this.pushPointOrigin(point)
      const row = point.row
      point.row = point.column
      point.column = row
    })
  }

  calcDifference(args: ModArgsCalcDifference, points?:DataPoint[]): void {
    const {match, item} = args

    const oppoMatch = (match === 'row') ? 'column' : 'row'

    this.targetPoints(points).forEach(point => {
      const vsPoint = this.points.find(vsPoint =>
        point !== vsPoint
        && point[oppoMatch] === vsPoint[oppoMatch]
        && vsPoint[match] === item
      )

      if(vsPoint) {
        point.value = Number(point.value) - Number(vsPoint.value)
      }
    })
  }

  calcSum(args: ModArgsCalcSum, points?:DataPoint[]): void {
    const {match, items, alias} = args

    const oppoMatch = (match === 'row') ? 'column' : 'row'
    const sumStacks = <AggregatePoints[]>[]

    items?.forEach(item => {
      const sumPoints = this.points.filter(vsPoint => vsPoint[match] === item)
      sumPoints.forEach(sumPoint => {
        const existing = sumStacks.find(existingSumPoint =>
          existingSumPoint.alias === alias
          && existingSumPoint.key === sumPoint[oppoMatch]
        )
        this.pushToStack(existing, sumPoint, sumStacks, alias, sumPoint[oppoMatch])
      })
    })

    sumStacks.forEach(sumStack => {
      this.pushToPoints(sumStack, match, alias, this.targetPoints(points))
    })
  }

  pushToStack(existing:AggregatePoints | undefined, 
    sumPoint: DataPoint, 
    sumStacks: AggregatePoints[],
    alias: string,
    key: string): void {
    if(!existing) {
      sumStacks.push({
        alias: alias,
        key: key,
        points: [ sumPoint ]
      })
    } else {
      existing.points.push(sumPoint)
    }
  }

  pushToPoints(sumStack:AggregatePoints, 
    match:DataPointTarget, 
    alias: string,
    points: DataPoint[]): void {
    const newItem = {...sumStack.points[0]}
    newItem[match] = alias
    newItem.value = 0
    sumStack.points.forEach((sumPoint) => {
      newItem.value = Number(newItem.value) + Number(sumPoint.value)
    })
    points.push(newItem)
  }

  rename(args: ModArgsRename, points?:DataPoint[]): void {
    const {renameStack} = args
    this.targetPoints(points).forEach(point => {
      this.pushPointOrigin(point)
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

  pushPointOrigin(point:DataPoint) {
    point.origin = (!point.origin)
      ? [{...point}] : [...point.origin, {...point}]
  }

  dump(points?:DataPoint[]) {
    vd(this.targetPoints(points))
  }
}
