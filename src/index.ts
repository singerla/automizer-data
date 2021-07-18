
import { PrismaClient } from '@prisma/client'

import { Query } from './query'
import { Import } from './import'
import { DataTag, DataGrid } from './types'
import { all, filterByDataTag, filterBy } from './filter';
import { value, valueMeta, difference, dump } from './cell';


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

const Reader = Import

const cell = {
  value, valueMeta, difference, dump
}
const filter = {
  all, filterByDataTag, filterBy
}

export { Reader, filter, cell, getData }
