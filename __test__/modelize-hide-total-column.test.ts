import { Query, Result } from "../src";
import { filterBy, filterByDataTag } from "../src/filter";
import { value } from "../src/cell";
import { vd } from "../src/helper";

test("Use modelizer to hide 'Total' column.", async () => {
  const selector = [
    {
      category: "variable",
      value: "Q12",
    },
    {
      category: "subgroup",
      value: "Gender",
    },
  ];

  const query = await Query.run({
    selector,
    useModelizer: true,
    modelizer: {
      strict: false,
    },
  });
  const mod = query.getModelizer();

  // const fixture = [];
  //
  // expect(keys).toStrictEqual(fixture);
});
