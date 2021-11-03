import {getData, getResult, Store} from './index';
import { DataGrid } from './types';
import { all, filterByDataTag, filterBy } from './filter';
import { value, difference } from './cell'
import {PrismaClient} from '../prisma/client';

const run = async() => {
  const client = new PrismaClient()
  const selector = [
    [
      4,6,   // Age, Gender
      3,5  // Q13, Sweden
    ]
  ]

  const grid = {
    rows: all('row'),
    columns: all('column'),
    cell: value
  }

  const result = await getResult(selector, grid, client)
  // console.log(result.points.length)

  return result
}

run().then(result => {

})
