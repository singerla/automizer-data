
import { PrismaClient } from '@prisma/client'
import { filterByColumn, filterByDataTag, filterByRow } from './src/filter'
import { Query } from './src/query'
import { DataTag, DataGrid, DataPoint, DataGridFunction, DataPointFilter, ResultCell } from './src/types'

const data = require('./test-data.json')

const query = new Query(
  new PrismaClient()
)

const tags = [
  // {
  //   category: 'country',
  //   value: 'Norway'
  // },
  {
    category: "variable",
    value: "Q12"
  }
]

const grid = <DataGrid> {
  rows: [
    filterByColumn('19-29'),
    filterByColumn('30-39')
  ],
  columns: [
    filterByRow('answer 1'),
    filterByRow('answer 2'),
    filterByDataTag(<DataTag> {
      value: 'Bar soap',
    })
  ],
  cell: (points: DataPoint[]): ResultCell => {
    return points.map(point => point.value + ' ' + point.meta).join('|') 
  }
}

const getData = async() => {
  await query.get(tags)
  query.merge(grid)

  console.dir(query.result, {depth: 10})
}

getData()
  .catch(e => {
    throw e
  })
  .finally(async () => {
    await query.prisma.$disconnect()
  })