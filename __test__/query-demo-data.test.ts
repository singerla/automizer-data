import { getData } from '../src';
import { DataGrid } from '../src/types';
import { all } from '../src/filter';
import { value } from '../src/cell';

test('get demo data and convert to SeriesCategories', async () => {
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
    rows: all('row'),
    columns: all('column'),
    cell: value
  }

  const result = await getData(selector, grid)

  // console.dir(result, {depth: 10})

  expect(result.series.length).toBe(4);
  expect(result.categories.length).toBe(4);
});
