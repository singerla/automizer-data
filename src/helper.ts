import {Tag} from '../src/client';

export const getNestedClause = (selectionTags:Tag[]): any => {
  const tagGroups = getTagGroupsByCategory(selectionTags)

  if(!tagGroups || !tagGroups[0]) {
    return false
  }

  let clause = clauseCallback(tagGroups[0])
  for(let i in tagGroups) {
    if(Number(i) > 0) {
      setNestedClause(clause, tagGroups[i])
    }
  }

  return clause
}

export const getTagGroupsByCategory = (selectionTags:Tag[]): any => {
  const groups = <any>{}
  selectionTags.forEach(tag => {
    if(!groups[tag.categoryId]) {
      groups[tag.categoryId] = []
    }
    groups[tag.categoryId].push(tag.id)
  })
  return Object.values(groups)
}

export const clauseCallback = (ids: number[]): any => {
  const selector = (ids.length > 1)
    ? { in: ids } : ids[0]
  return {
    tags: {
      some: {
        id: selector
      }
    }
  }
}

export const setNestedClause = (clause:any, ids:number[]): void => {
  if(!clause.AND) {
    clause.AND = clauseCallback(ids)
  } else {
    setNestedClause(clause.AND, ids)
  }
}

export const vd = (v:any, keys?: boolean): void => {
  if(keys && typeof v === 'object') {
    v = Object.keys(v)
  }
  console.log('--------- [automizer-data] ---------')
  // @ts-ignore
  console.log((new Error()).stack.split("\n")[2].trim())
  console.dir(v, {depth:10})
  console.log()
}
