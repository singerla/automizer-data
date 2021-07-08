
import { PrismaClient } from '@prisma/client'
import { all, filterByDataTag } from './src/filter';
import { value, difference } from './src/cell'
import { Query } from './src/query'
import { DataTag, DataGrid, DataPoint, ResultCell } from './src/types'


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

// const grid = <DataGrid> {
//   categories: [
//     filterByColumn('19-29'),
//     filterByColumn('30-39')
//   ],
//   series: [
//     filterByRow('answer 1'),
//     filterByRow('answer 2'),
//     filterByDataTag(<DataTag> {
//       value: 'Bar soap',
//     })
//   ],
//   cell: difference
// }

const grid = <DataGrid> {
  rows: all('row'),
  columns: all('column'),
  cell: value
}

const getData = async() => {
  await query.get(tags)
  query.merge(grid)

  console.dir(query.toSeriesCategories(), {depth: 10})
}

getData()
  .catch(e => {
    throw e
  })
  .finally(async () => {
    await query.prisma.$disconnect()
  })
