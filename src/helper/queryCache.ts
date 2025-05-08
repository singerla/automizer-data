import { CachedObject, IdSelector, Selector } from "../types/types";

export default class QueryCache {
  buffer: CachedObject[] = [];
  exists = (selector: IdSelector, isNonGreedy: boolean): boolean => {
    const key = this.getKey(selector, isNonGreedy);
    return !!this.buffer.find((obj) => obj.key === key);
  };
  get = (selector: IdSelector, isNonGreedy: boolean): CachedObject => {
    const key = this.getKey(selector, isNonGreedy);
    // vd('from cache: ' + key);
    return this.buffer.find((obj) => obj.key === key);
  };
  set = (
    selector: IdSelector,
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

  getKey = (selector: IdSelector, isNonGreedy: boolean): string => {
    return selector.join("|") + (isNonGreedy ? "-ng" : "");
  };
}
