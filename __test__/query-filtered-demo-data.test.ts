import {getData, Store} from '../src';
import { DataGrid } from '../src/types';
import { all, filterByDataTag, filterBy } from '../src/filter';
import { value, difference } from '../src/cell'
import {PrismaClient} from '../src/client';

test('get demo data and convert to SeriesCategories', async () => {
  // const data = require('./data/test-data.json')
  // const store = new Store(
  //   new PrismaClient()
  // )
  // await store.run(data)

  const selector = [
    {
      category: "variable",
      value: "Q13"
    },
    {
      category: "subgroup",
      value: "Gender"
    }
  ]

  const grid = <DataGrid> {
    rows: all('row'),
    //   [
    //   filterBy('row', 'answer 1'),
    //   filterBy('row', 'answer 2')
    // ],
    columns: all('column')
      // [

      // filterBy('column', '19-29'),
      // filterBy('column', '30-39'),
      // filterByDataTag( {
      //   value: 'Bar soap',
      //   category: '2'
      // }, 'Test')
    // ]
    ,
    cell: difference
  }

  const result = await getData(selector, grid)

    
  const chartData = result.toSeriesCategories()
  //
  // console.log(result.result.body[0].cols)

  expect(chartData.series.length).toBe(4);
  expect(chartData.categories.length).toBe(3);
});
