import { vd } from './helper';
import {DataPoint, DataTag, ResultCell, ResultCellInfo} from './types';

export const valueMeta =  (params: any) => {
  const targetMetaTag = (params.args && params.args.mode)
    ? params.args.mode : 'base'
  return (points: DataPoint[]): ResultCell => {
    return points.map(point => point
      .meta?.filter(meta => meta.key === targetMetaTag)
            .map(meta => meta?.value))
      .join('|')
  }
}

export const value = (params: any) => {
  return (points: DataPoint[]): ResultCell|DataPoint[] => {
    const args = params.args
    if(!args || !args.mode) {
      return points
    }

    const from = args.mode
    const targetItems = (args.targetItems) ? args.targetItems : []
    const targetPoints = points.filter((point:any) => targetItems.indexOf(point[from]) > -1)

    return targetPoints
  }
}

export const dump = (points: DataPoint[]): ResultCell => {
  console.dir(points, { depth: 10 })
  return points[0].value
}

export const renderPoints = (points: DataPoint[]): ResultCell => {
  return points.map(point => point.value).join('|')
}
