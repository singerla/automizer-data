
import { PrismaClient } from '@prisma/client'
import { Query } from './src/query'
import { DataTag, DataGrid } from './src/types'

const data = require('./test-data.json')

const query = new Query(
  new PrismaClient()
)

const tags = [
  {
    category: 'country',
    value: 'Norway'
  },
  {
    category: "variable",
    value: "Q12"
  }
]

const grid = {
  rows: 'columns',
  columns: 'rows'
}

const getData = async(tags: DataTag[], grid: DataGrid) => {
  const datasheets = await query.get(tags)
  const result = datasheets.merge(grid)

  console.dir(result, {depth: 10})
}

getData(tags, grid)
  .catch(e => {
    throw e
  })
  .finally(async () => {
    await query.prisma.$disconnect()
  })