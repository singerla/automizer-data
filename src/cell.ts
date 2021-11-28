import { vd } from './helper';
import {DataPoint, DataTag, ResultCell, ResultCellInfo} from './types';

export const difference = (params: any) => {
  return (points: DataPoint[]): ResultCell => {
    points = processSumPoints(points)

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

export const renderPoints = (points: DataPoint[]): ResultCell => {
  return points.map(point => point.value).join('|')
}

const processSumPoints = (points: DataPoint[]): DataPoint[] => {
  const sumPoints = points.filter(point => point.mode && point.mode === 'sum')
  if(sumPoints.length > 0) {
    sumPoints.reduce((previousValue, currentValue) => {
      previousValue.value = Number(previousValue.value) + Number(currentValue.value)
      return previousValue
    })
    points = points.filter(point => point.mode && point.mode !== 'sum')
    points.push(sumPoints[0])
  }
  return points
}
