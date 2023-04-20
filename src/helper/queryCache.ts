import { CachedObject, Selector } from "../types/types";

export default class QueryCache {
  buffer: CachedObject[] = [];
  exists = (selector: Selector, isNonGreedy: boolean): boolean => {
    const key = this.getKey(selector, isNonGreedy);
    return !!this.buffer.find((obj) => obj.key === key);
  };
  get = (selector: Selector, isNonGreedy: boolean): CachedObject => {
    const key = this.getKey(selector, isNonGreedy);
    // vd('from cache: ' + key);
    return this.buffer.find((obj) => obj.key === key);
  };
  set = (
    selector: Selector,
    isNonGreedy: boolean,
    data: CachedObject
  ): void => {
    if (!this.exists(selector, isNonGreedy)) {
      const key = this.getKey(selector, isNonGreedy);
      // vd('to cache: ' + key);
      this.buffer.push({
        key,
        ...data,
      });
    }
  };
  clear = () => {
    this.buffer = [];
  };

  getKey = (selector: Selector, isNonGreedy): string => {
    return selector.join("|") + (isNonGreedy ? "-ng" : "");
  };
}
