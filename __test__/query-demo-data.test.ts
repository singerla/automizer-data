import {getData} from '../src';
import {all} from '../src/filter';
import {value} from '../src/cell';

test('Selector demo data and convert to SeriesCategories', async () => {
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

  const grid = {
    row: all('row'),
    column: all('column'),
    cell: value
  }

  const result = await getData(selector, grid)
  const chartData = result.toSeriesCategories()

  expect(chartData.series.length).toBe(4);
  expect(chartData.categories.length).toBe(3);
});
