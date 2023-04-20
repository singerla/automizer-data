import { Query } from "../src";
import QueryCache from "../src/helper/queryCache";

const cache = new QueryCache();

test("Query demo data, cache it and retrieve it from cache.", async () => {
  await Query.run({
    selector: [[5, 1]],
    cache,
  });
  expect(cache.buffer.length).toBe(1);

  await Query.run({
    selector: [[5, 1]],
    cache,
  });
  expect(cache.buffer.length).toBe(1);

  await Query.run({
    selector: [[2, 3]],
    cache,
  });
  expect(cache.buffer.length).toBe(2);

  // expect(chartData.series.length).toBe(4);
  // expect(chartData.categories.length).toBe(3);
});
