import { Query, Result } from "../src";

test("get demo data, use OR with more than one tag per category", async () => {
  const selector = [
    [
      4,
      6, // Age, Gender
      3,
      5, // Q13, Sweden
    ],
  ];

  const query = await Query.run({ selector });
  const chartData = new Result(query).toSeriesCategories();

  expect(chartData.series.length).toBe(7);
  expect(chartData.categories.length).toBe(6);
});
