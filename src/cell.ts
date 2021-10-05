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

export const value = (params: any) => {
  return (points: DataPoint[]): ResultCell => {
    const args = params.args
    
    if(!points) {
      return '-'
    }
    
    if(!args || !args[0]) {
      return points.map(point => point.value).join('|')
    }

    const from = args[0]
    const targetItems = args[1]
    const targetPoints = points.filter((point:any) => {
      if(from === 'row' || from === 'column') {
        return targetItems.indexOf(point[from]) > -1
      } else {
        return (point.tags.find((tag: any) =>
          tag.categoryId === Number(from)
          && targetItems.indexOf(tag.value) > -1)
        )
      }
    })

    if(targetPoints) {
      return targetPoints.map((targetPoint:any) => targetPoint.value).join('|')
    } else {
      return ''
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
