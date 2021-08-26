import { PrismaClient } from './client'

import { Query } from './query'
import { Store } from './store'
import { Parser } from './parser/parser'
import { DataTag } from './types'
import { all, filterByDataTag, filterBy } from './filter';
import { value, valueMeta, difference, points, dump } from './cell';
import { byColId } from './sort';

const getData = async(selector: DataTag[] | DataTag[][], grid: any, prisma?: PrismaClient) => {
  if(!prisma) {
    prisma = new PrismaClient()
  }

  const query = new Query(prisma)
  await query.get(selector)
  const result = query.merge(grid)
  await query.prisma.$disconnect()

  return result
}

const getDataObject = async(selector: number[][], grid: any, prisma: any) => {
  const query = new Query(prisma)
  await query.getByIds(selector)

  if(query.points.length > 0) {
    await query.merge(grid)
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

export { Parser, Store, filter, cell, sort, getData, getDataObject }
