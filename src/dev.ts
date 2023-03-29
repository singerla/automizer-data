import { Query, Selector } from "./index";
import { vd } from "./helper";
import { CachedObject, CellKeys, Datasheet } from "./types/types";
import { Tag } from "./client";

const run = async () => {
  const selector = [[5, 1]];

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
    set: (
      selector: Selector,
      isNonGreedy: boolean,
      data: CachedObject
    ): void => {
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

  await Query.run({
    selector: [[5, 1]],
    cache,
  });

  vd(cache.buffer.length);

  await Query.run({
    selector: [[5, 1]],
    cache,
  });
  vd(cache.buffer.length);

  await Query.run({
    selector: [[2, 3]],
    cache,
  });
  vd(cache.buffer.length);

  // vd(cache.buffer);
};

run()
  .then((result) => {})
  .catch((e) => {
    throw e;
  });
