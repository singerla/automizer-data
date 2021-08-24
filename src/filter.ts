import {
  CellKeys,
  DataGridCategories,
  DataGridFunction,
  DataPoint,
  DataPointFilter,
  DataPointFilterResult,
  DataTag,
} from './types';

export const filterByDataTag = <DataGridFunction> function(targetTag: DataTag, label: string): DataPointFilter {
  return (points: DataPoint[]): DataPointFilterResult => {
    return {
      points: points.filter(
        (point: DataPoint) => point.tags.find(
          (tag: DataTag) => tag.value === targetTag.value)),
      label: label
    }
  }
}

export const filterBy = <DataGridFunction> function(section: 'row'|'column', key: string): DataPointFilter {
  return (points: DataPoint[]): DataPointFilterResult => {
    return {
      points: points.filter((point: DataPoint) => point[section] === key),
      label: key
    }
  }
}

export const all = function(section: 'row'|'column'): DataGridCategories {
  return (keys: CellKeys): DataPointFilter[] => {
    if(!keys.hasOwnProperty(section)) {
      throw new Error ('Filter "all": no keys for section: ' + section)
    }
    return Object.keys(keys[section])
      .map(key => filterBy(section, key))
  }
}
