import { PrismaClient } from './client'

import Query from './query'
import Points from './points'
import Result from './result';

import { Store } from './store'
import { Parser } from './parser/parser'
import { Gesstabs } from './parser/gesstabs'

import {all, filterByDataTag, filterBy} from './filter';
import { value, valueMeta, dump } from './cell';
import { byColId } from './sort';
import { getNestedClause, getTagGroupsByCategory, vd } from './helper'

import {
  DataPoint,
  DataGrid,
  DataGridCategories,
  DataPointFilter,
  DataPointModifier,
  DataResultCellFilter,
  DataTag,
  DataGridTransformation
} from './types'
import {
  ParserOptions,
  RawResultInfo,
  StoreOptions,
  Tagger
} from './types';
import {
  ModifierCommandArgument,
  DataPointSortation,
  ModArgsFilter,
  Selector,
} from './types';


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

const getResult = async(selector: number[][], grid: any, prisma: any): Promise<Result> => {
  const query = new Query(prisma).setGrid(grid)
  await query.getByIds(selector)

  if(query.points.length > 0) {
    await query.merge()
  }

  return new Result(query)
}


const cell = {
  value, valueMeta, dump
}
const filter = {
  all, filterByDataTag, filterBy
}
const sort = {
  byColId
}

export type { ParserOptions, RawResultInfo, StoreOptions, Tagger }
export type {
  DataPoint,
  DataGrid,
  DataGridCategories,
  DataPointFilter,
  DataPointModifier,
  DataResultCellFilter,
  DataGridTransformation
}
export type {
  ModifierCommandArgument,
  DataPointSortation,
  ModArgsFilter,
  Selector
}
export { Query, Parser, Gesstabs, Store, filter, cell, sort, getData, getResult }
export { Points, Result }
export { getNestedClause, getTagGroupsByCategory }
