import {getData, Store} from './index';
import { DataGrid } from './types';
import { all, filterByDataTag, filterBy } from './filter';
import { value, difference } from './cell'

const run = async() => {
  const selector = [
    {
      category: "variable",
      value: "Q13"
    },
    {
      category: "subgroup",
      value: "Age"
    }
  ]

  const grid = <DataGrid> {
    rows: all('row'),
    columns: all('column'),
    cell: difference
  }

  const result = await getData(selector, grid)

  return result
}

run().then(result => {

})
