import { Query } from "../src";
import { all } from "../src/filter";
import { value } from "../src/cell";

test("get error due to insufficient selection", () => {
  const selector = [[]];

  const grid = {
    row: all("row"),
    column: all("column"),
    cell: value(),
  };

  // expect(() => {
  //   Query.run({ selector, grid });
  // }).toThrow();
});
