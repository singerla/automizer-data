import {getData} from '../src';
import {filterBy, filterByDataTag} from '../src/filter';
import {value} from '../src/cell';

test('Query & filter demo data and convert to SeriesCategories', async () => {
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

  const grid = {
    row: [
      filterBy('row', 'answer 1'),
      filterBy('row', 'answer 2')
    ],
    column: [
      filterBy('column', '19-29'),
      filterBy('column', '30-39'),
      filterByDataTag( {
        value: 'Bar soap',
        category: '2'
      }, 'Test')
    ],
    cell: value
  }

  const result = await getData(selector, grid)
  const chartData = result.toSeriesCategories()

  expect(chartData.series.length).toBe(3);
  expect(chartData.categories.length).toBe(2);
});
