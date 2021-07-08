
import { PrismaClient } from '@prisma/client'
import { all, filterByDataTag } from './src/filter';
import { value, difference } from './src/cell'
import { Query } from './src/query'
import { DataTag, DataGrid, DataPoint, ResultCell } from './src/types'

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
