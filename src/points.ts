import { vd } from './helper';
import {DataPoint, DataPointTarget, RenameLabel} from './types';

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

  filter(key:string, value:string, replace?:boolean): DataPoint[] {
    if(key === 'row' || key === 'column') {
      const points = this.points.filter(point => point[key] === value)
      if(replace === true) {
        this.replace(points)
      }
      return points
    }
    return this.points
  }

  addStringTolabel(value: string, target:'row'|'column', points?:DataPoint[]): void {
    this.targetPoints(points).forEach(point => {
      point[target] += value
    })
  }

  addTagTolabel(categoryId: number, target:'row'|'column', glue?:string, points?:DataPoint[]): void {
    glue = (!glue) ? ' ' : glue
    this.targetPoints(points).forEach(point => {
      const tag = point.tags.find(tag => tag.categoryId === categoryId)
      const value = (tag?.value) ? tag?.value : 'n/a'
      point[target] += glue + value
    })
  }

  addToOthers(match:'row'|'column', points?:DataPoint[], push?:boolean): DataPoint[] {
    push = (!push) ? true : push
    const insert = (match==='row') ? 'column' : 'row'
    const addTo = <DataPoint[]>[]
    this.targetPoints(points).forEach(addPoint => {
      this.points.forEach(point => {
        if(addPoint[match] === point[match] && addPoint[insert] !== point[insert]) {
          const addToPoints = <DataPoint> {...addPoint}
          addToPoints[insert] = point[insert]
          addTo.push(addToPoints)
        }
      })
    })

    if(push === true) {
      this.push(addTo)
    }

    return addTo
  }

  addMeta(key:string, points?:DataPoint[], glue?:string): void {
    glue = (!glue) ? ' ' : glue
    this.targetPoints(points).forEach(point => {
      const targetMeta = point.meta?.find(meta => meta.key === key)
      if(targetMeta && targetMeta.value) {
        point.value += String(glue) + targetMeta.value
      }
    })
  }

  map(categoryId: number, target:'row'|'column', points?:DataPoint[]): void {
    this.targetPoints(points).forEach(point => {
      const tag = point.tags.find(tag => tag.categoryId === categoryId)
      point[target] = (tag?.value) ? tag?.value : 'n/a'
    })
  }

  rename(renameStack: RenameLabel[], points?:DataPoint[]): void {
    this.targetPoints(points).forEach(point => {
      renameStack.forEach(rename => {
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
      if(rename.replace && rename.by) {
        if(point[target] && point[target] === rename.replace) {
          point[target] = rename.by
        }
      }

      if(rename.cb) {
        point[target] = rename.cb(point[target])
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
