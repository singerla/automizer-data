
import { PrismaClient } from '@prisma/client'

import { Query } from './query'
import { Import } from './import'
import { DataTag, DataGrid } from './types'
import { all } from './filter';
import { value } from './cell';

const getData = async(selector: DataTag[], grid: any, prisma?: PrismaClient) => {
  if(!prisma) {
    prisma = new PrismaClient()
  }

  const query = new Query(prisma)

  await query.get(selector)

  const result = query.merge(grid)
    .toSeriesCategories()

  await query.prisma.$disconnect()
  return result
}

const Reader = Import
const grid = {
  all, value
}

export { Reader, grid, getData }
