import { DataPoint, ResultCell } from './types';

export const difference = (points: DataPoint[]): ResultCell => {
  if(!points[0] || !points[1]) {
    return 'n/a'
  }

  return Number(points[0].value) - Number(points[1].value)
}

export const valueMeta = (points: DataPoint[]): ResultCell => {
  return points.map(point => point.value + ' ' + point.meta).join('|')
}

export const value = (points: DataPoint[]): ResultCell => {
  if(points && points[0] && points[0].value) {
    const suffix = (points[1]) ? '*' : ''
    return points[0].value + suffix
  } else {
    return ''
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
