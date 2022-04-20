import {getResult} from '../src';
import {all} from '../src/filter';
import {value} from '../src/cell';
import {PrismaClient} from '../src/client';

test('get demo data by tag IDs and convert to SeriesCategories', async () => {
  const client = new PrismaClient()
  const selector = [
    [3,5]
  ]

  const grid = {
    row: all('row'),
    column: all('column'),
    cell: value
  }

  const result = await getResult(selector, grid, client)
     .then(summary => {
      return summary
    })
    .catch(e => {
      throw e
    })
    .finally(async () => {
      await client.$disconnect()
    })

  const chartData = result.toSeriesCategories()

  // console.dir(chartData, {depth: 10})

  expect(chartData.series.length).toBe(7);
  expect(chartData.categories.length).toBe(6);
});
