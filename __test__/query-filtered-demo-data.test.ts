import { getData } from '../src';
import { DataGrid } from '../src/types';
import { all, filterByDataTag, filterBy } from '../src/filter';
import { value, difference } from '../src/cell'

test('get demo data and convert to SeriesCategories', async () => {
  const selector = [
    {
      category: "variable",
      value: "Q12"
    }
  ]

  const grid = <DataGrid> {
    rows: [
      filterBy('row', 'answer 1'),
      filterBy('row', 'answer 2')
    ],
    columns: [
      filterBy('column', '19-29'),
      filterBy('column', '30-39'),
      // filterByDataTag( {
      //   value: 'Bar soap',
      //   category: '2'
      // }, 'Test')
    ],
    cell: difference
  }

  const result = await getData(selector, grid)

  const chartData = result.toSeriesCategories()
  // console.dir(result, {depth: 10})

  expect(chartData.series.length).toBe(2);
  expect(chartData.categories.length).toBe(2);
});
