import {getDataObject, Store} from '../src';
import { DataGrid } from '../src/types';
import { all } from '../src/filter';
import { value } from '../src/cell';

import {PrismaClient} from "../prisma/client";

test('get error due to insufficient selection', async () => {
  const client = new PrismaClient()
  // const selector = [
  //   [1,2,3]
  // ]

  // const selector = [[3,5,4],[3,5,6]]

  const selector = [[3,5]]

  const grid = {
    rows: all('row'),
    columns: all('column'),
    cell: value
  }

  const dataObject = await getDataObject(selector, grid, client)

  expect(dataObject.sheets.length).toBe(0);
});
