import { all } from "../src/filter";
import { value } from "../src/cell";
import { Query, Result } from "../src";

test("Selector demo data and convert to SeriesCategories", async () => {
  const selector = [
    {
      category: "country",
      value: "Norway",
    },
    {
      category: "variable",
      value: "Q12",
    },
  ];

  const query = await Query.run({ selector });
  const chartData = new Result(query).toSeriesCategories();

  expect(chartData.series.length).toBe(4);
  expect(chartData.categories.length).toBe(3);
});
