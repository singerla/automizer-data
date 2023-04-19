import { Query, Convert } from "../src";

test("Select demo data and convert to SeriesCategories", async () => {
  const dataTagSelector = [
    [
      {
        category: "country",
        value: "Norway",
      },
      {
        category: "variable",
        value: "Q12",
      },
    ],
  ];

  const query = await Query.run({ dataTagSelector });
  const chartData = query.convert().toSeriesCategories();

  expect(chartData.series.length).toBe(4);
  expect(chartData.categories.length).toBe(3);
});
