import { PrismaClient } from './client'

import { Query } from './query'
import { Store } from './store'
import { Parser } from './parser/parser'
import { Gesstabs } from './parser/gesstabs'
import {DataPoint, DataGrid, DataGridCategories, DataPointFilter, DataPointModifier, DataResultCellFilter, DataTag } from './types'
import {all, filterByDataTag, filterBy} from './filter';
import { value, valueMeta, difference, points, dump } from './cell';
import { byColId } from './sort';
import { ParserOptions, RawResultInfo, StoreOptions, Tagger } from './types';
import { ModifierCommandArgument, DataPointSortation } from './types';
import { getNestedClause, getTagGroupsByCategory } from './helper'
import Points from './points'

const getData = async(selector: DataTag[] | DataTag[][], grid: any, prisma?: PrismaClient) => {
  if(!prisma) {
    prisma = new PrismaClient()
  }

  const query = new Query(prisma)
  query.setGrid(grid)
  await query.get(selector)
  const result = query.merge()
  await query.prisma.$disconnect()

  return result
}

const getDataObject = async(selector: number[][], grid: any, prisma: any) => {
  const query = new Query(prisma).setGrid(grid)
  await query.getByIds(selector)

  if(query.points.length > 0) {
    await query.merge()
  }

  return query
}

const cell = {
  value, valueMeta, difference, points, dump
}
const filter = {
  all, filterByDataTag, filterBy
}
const sort = {
  byColId
}

export type { ParserOptions, RawResultInfo, StoreOptions, Tagger }
export type {DataPoint, DataGrid, DataGridCategories, DataPointFilter, DataPointModifier, DataResultCellFilter}
export type { ModifierCommandArgument, DataPointSortation }
export { Query, Parser, Gesstabs, Store, filter, cell, sort, getData, getDataObject }
export { Points }
export { getNestedClause, getTagGroupsByCategory }
