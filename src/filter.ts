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

export const filterBy = <DataGridFunction> function(section: string, key: string): DataPointFilter {
  return (points: DataPoint[]): DataPointFilterResult => {
    return {
      points: points.filter((point: any) => {
        if((section === 'row' || section === 'column') && point[section] === key) {
          return true
        } else {
          return (point.tags.find((tag: any) => tag.categoryId === Number(section) && tag.value === key))
        }
        return false
      }),
      label: key
    }
  }
}

export const all = function(section: string): DataGridCategories {
  return (keys: CellKeys): DataPointFilter[] => {
    if(!keys.hasOwnProperty(section)) {
      throw new Error ('Filter "all": no keys for section: ' + section)
    }
    return Object.keys(keys[section])
      .map(key => filterBy(section, key))
  }
}
