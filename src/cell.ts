import { DataPoint, ResultCell } from './types';

export const difference = (params: any) => {
  return (points: DataPoint[]): ResultCell => {
    if (!points[0] && !points[1]) {
      return 'n/a'
    }

    if (points[0] && !points[1]) {
      return points[0].value
    }

    if(params.args && params.args[0]) {
      switch(params.args[0]) {
        case 'reverted':
          return Number(points[1].value) - Number(points[0].value)
      }
    }

    return Number(points[0].value) - Number(points[1].value)
  }
}

export const valueMeta =  (params: any) => {
  const targetMetaTag = (params.args && params.args[0])
    ? params.args[0] : 'base'
  return (points: DataPoint[]): ResultCell => {
    return points.map(point => point
      .meta?.filter(meta => meta.key === targetMetaTag)
            .map(meta => meta?.value))
      .join('|')
  }
}

export const value = (params: any) => {
  return (points: DataPoint[]): ResultCell => {
    if(!points) {
      return '-'
    }

    const args = params.args
    if(!args || !args[0]) {
      return points.map(point => point.value).join('|')
    }

    const from = args[0]
    const targetItems = args[1]
    const targetPoints = points.filter((point:any) => targetItems.indexOf(point[from]) > -1)

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
