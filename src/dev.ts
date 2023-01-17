import { getResult } from "./index";
import { all } from "./filter";
import { dump, renderPoints, value } from "./cell";
import { PrismaClient } from "./client";
import { vd } from "./helper";

const run = async () => {
  const client = new PrismaClient();
  const selector = [[3, 5]];

  const grid = {
    row: all("row"),
    column: all("column"),
    cell: value({}),
  };

  const result = await getResult(selector, grid, client)
    .then((summary) => {
      return summary;
    })
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await client.$disconnect();
    });

  const chartData = result.toSeriesCategories();

  console.dir(chartData, { depth: 10 });
};

run().then((result) => {});
