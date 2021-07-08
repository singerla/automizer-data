import { DataPoint, ResultCell } from './types';

export const difference = (points: DataPoint[]): ResultCell => {
  return Number(points[0].value) - Number(points[1].value)
}

export const valueMeta = (points: DataPoint[]): ResultCell => {
  return points.map(point => point.value + ' ' + point.meta).join('|')
}

export const value = (points: DataPoint[]): ResultCell => {
  return points[0].value
}
