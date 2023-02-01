import { Query, Result } from "../src";
import { filterBy, filterByDataTag } from "../src/filter";
import { value } from "../src/cell";
import { vd } from "../src/helper";

test("Query & filter demo data and convert to SeriesCategories", async () => {
  const selector = [
    {
      category: "variable",
      value: "Q13",
    },
    {
      category: "subgroup",
      value: "Gender",
    },
  ];

  const grid = {
    row: [filterBy("row", "answer 1"), filterBy("row", "answer 2")],
    column: [
      filterBy("column", "19-29"),
      filterBy("column", "30-39"),
      filterByDataTag(
        {
          value: "Bar soap",
          category: "2",
        },
        "Test"
      ),
    ],
    cell: value(),
  };

  const query = await Query.run({ selector, grid });
  const chartData = new Result(query).toSeriesCategories();

  expect(chartData.series.length).toBe(3);
  expect(chartData.categories.length).toBe(2);
});
