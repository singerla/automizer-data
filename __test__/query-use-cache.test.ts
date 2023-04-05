import { all } from "../src/filter";
import { value } from "../src/cell";
import { CachedObject, Query, Convert, Selector } from "../src";
import { vd } from "../src/helper";

const cache = {
  buffer: <CachedObject[]>[],
  exists: (selector: Selector, isNonGreedy: boolean): boolean => {
    const key = cache.getKey(selector, isNonGreedy);
    return !!cache.buffer.find((obj) => obj.key === key);
  },
  get: (selector: Selector, isNonGreedy: boolean): CachedObject => {
    const key = cache.getKey(selector, isNonGreedy);
    return cache.buffer.find((obj) => obj.key === key);
  },
  set: (selector: Selector, isNonGreedy: boolean, data: CachedObject): void => {
    const key = cache.getKey(selector, isNonGreedy);
    if (!cache.exists(selector, isNonGreedy)) {
      cache.buffer.push({
        key,
        ...data,
      });
    }
  },
  getKey: (selector: Selector, isNonGreedy): string => {
    return selector.join("|") + (isNonGreedy ? "-ng" : "");
  },
};

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
