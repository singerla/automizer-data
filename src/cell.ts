import { vd } from './helper';
import {DataPoint, DataTag, ResultCell, ResultCellInfo} from './types';

export const difference = (params: any) => {
  return (points: DataPoint[]): ResultCell => {
    if (!points[0] && !points[1]) {
      return 'n/a'
    }

    if (points[0] && !points[1]) {
      return points[0].value
    }

    if(params.args && params.args.mode) {
      switch(params.args.mode) {
        case 'reverted':
          return Number(points[1].value) - Number(points[0].value)
      }
    }

    return Number(points[0].value) - Number(points[1].value)
  }
}

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
  return (points: DataPoint[]): ResultCell|ResultCellInfo[] => {
    if(!points) {
      return '-'
    }

    const args = params.args
    if(!args || !args.mode) {
      return renderPointInfoDiff(points)
    }

    const from = args.mode
    const targetItems = (args.targetItems) ? args.targetItems : []
    const targetPoints = points.filter((point:any) => targetItems.indexOf(point[from]) > -1)

    if(targetPoints && targetPoints.length === 1) {
      return targetPoints[0].value
    } else if(targetPoints) {
      return renderPointInfoDiff(targetPoints)
    } else {
      return null
    }
  }
}

export const points = (points: DataPoint[]): ResultCell => {
  // console.dir(points, {depth:10})
  if(points.length) {
    return points.map(point => {
      if(point.value) {
        return point.value
      } else {
        return '-'
      }
    }).join('/')
  }

  return 'n/a'
}


export const dump = (points: DataPoint[]): ResultCell => {
  console.dir(points, { depth: 10 })
  return points[0].value
}

export const renderPointInfoDiff = (points: DataPoint[]): ResultCell => {
  return points.map(point => point.value).join('|')
}
