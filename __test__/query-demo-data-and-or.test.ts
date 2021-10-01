import {getDataObject, Store} from '../src';
import { DataGrid } from '../src/types';
import { all } from '../src/filter';
import { value } from '../src/cell';
import {PrismaClient} from '../src/client';

test('get demo data, use OR with more than one tag per category', async () => {
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

  const result = await getDataObject(selector, grid, client)
     .then(summary => {
      return summary
    })
    .catch(e => {
      throw e
    })
    .finally(async () => {
      await client.$disconnect()
    })

  console.log(result.points.length)
  const chartData = result.toSeriesCategories()
  // console.log(chartData)

  // console.dir(chartData, {depth: 10})

  // expect(chartData.series.length).toBe(7);
  // expect(chartData.categories.length).toBe(6);
});
