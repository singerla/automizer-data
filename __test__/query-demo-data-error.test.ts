import { getResult, Store } from "../src";
import { DataGrid } from "../src/types/types";
import { all } from "../src/filter";
import { value } from "../src/cell";
import { PrismaClient } from "../src/client";

test("get error due to insufficient selection", async () => {
  const client = new PrismaClient();
  const selector = [[]];

  const grid = {
    row: all("row"),
    column: all("column"),
    cell: value,
  };

  const dataObject = await getResult(selector, grid, client)
    .then((summary) => {
      return summary;
    })
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await client.$disconnect();
    });

  expect(dataObject.allSheets.length).toBe(0);
});
