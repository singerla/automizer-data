import { Query } from "../src";

test("Convert a query result to pptx-automizer ChartData / TableData.", async () => {
  const queryResult = await Query.run({
    selector: [[5, 1]],
  });

  const toSeriesCategories = queryResult.convert().toSeriesCategories();
  const toVerticalLines = queryResult.convert().toVerticalLines();
  const toCombo = queryResult.convert().toCombo();
  const toScatter = queryResult.convert().toScatter();
  const toBubbles = queryResult.convert().toBubbles();
  const toTable = queryResult.convert().toTable();

  // expect(chartData.series.length).toBe(4);
  // expect(chartData.categories.length).toBe(3);
});
