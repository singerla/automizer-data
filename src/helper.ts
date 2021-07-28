export const getNestedClause = (ids: number[]): any => {
  let clause = clauseCallback(ids[0])
  for(let i in ids) {
    if(Number(i) > 0) {
      setNestedClause(clause, ids[i])
    }
  }
  return clause
}

export const clauseCallback = (id: number): any => {
  return {
    tags: {
      some: {
        id: id
      }
    }
  }
}

export const setNestedClause = (clause:any, id:number): void => {
  if(!clause.AND) {
    clause.AND = clauseCallback(id)
  } else {
    setNestedClause(clause.AND, id)
  }
}
