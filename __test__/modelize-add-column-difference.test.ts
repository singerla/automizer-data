import { Query, Result } from "../src";
import { filterBy, filterByDataTag } from "../src/filter";
import { value } from "../src/cell";
import { vd } from "../src/helper";

test("Use modelizer to add a difference column.", async () => {
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

  mod.getColumn("Difference").each((cell) => {
    const totalCell = cell.getRow().getCell("Total").toNumber();
    const vsCell = cell.getRow().getCell("female").toNumber();
    cell.setValue(totalCell - vsCell);
  });

  const diffs = mod.getColumn("Difference").collect();
  const fixture = [8, 15, -27];

  expect(diffs).toStrictEqual(fixture);
});
