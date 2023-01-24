import { Query, Result } from "../src";
import { all } from "../src/filter";
import { value } from "../src/cell";
import { PrismaClient } from "../src/client";

test("get demo data by tag IDs and convert to SeriesCategories", async () => {
  const selector = [[3, 5]];

  const query = await Query.run({ selector });
  const chartData = new Result(query).toSeriesCategories();

  // console.dir(chartData, { depth: 10 });

  expect(chartData.series.length).toBe(7);
  expect(chartData.categories.length).toBe(6);
});
