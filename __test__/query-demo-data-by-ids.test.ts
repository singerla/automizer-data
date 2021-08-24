import {getDataObject, Store} from '../src';
import { DataGrid } from '../src/types';
import { all } from '../src/filter';
import { value } from '../src/cell';
import {PrismaClient} from '../src/client';

test('get demo data by tag IDs and convert to SeriesCategories', async () => {
  const client = new PrismaClient()
  const selector = [
    [1,2,3]
  ]

  const grid = {
    rows: all('row'),
    columns: all('column'),
    cell: value
  }

  const result = await getDataObject(selector, grid, client)
  const chartData = result.toSeriesCategories()

  // console.dir(chartData, {depth: 10})

  expect(chartData.series.length).toBe(4);
  expect(chartData.categories.length).toBe(3);
});
