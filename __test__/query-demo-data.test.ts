import {getData, Store} from '../src';
import {all} from '../src/filter';
import {value} from '../src/cell';
import {PrismaClient} from '../src/client';

test('get demo data and convert to SeriesCategories', async () => {
  const data = require('./data/test-data.json')
  const client = new PrismaClient()
  const store = new Store(client)

  await store.run(data)

  const selector = [
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

  const grid = {
    row: all('row'),
    column: all('column'),
    cell: value
  }

  const result = await getData(selector, grid)
  // const chartData = result.toSeriesCategories()
  //
  // // console.dir(chartData, {depth: 10})
  //
  // expect(chartData.series.length).toBe(4);
  // expect(chartData.categories.length).toBe(3);
});
