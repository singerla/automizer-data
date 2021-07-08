
import { PrismaClient } from '@prisma/client'
import { Query } from './query'
import { DataTag, DataGrid } from './types'

const query = new Query(
  new PrismaClient()
)

export const getData = async(selector: DataTag[], grid: DataGrid) => {
  await query.get(selector)

  const result = query.merge(grid)
    .toSeriesCategories()

  await query.prisma.$disconnect()
  return result
}
