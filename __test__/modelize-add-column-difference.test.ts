import { Query } from "../src";
import { DataTagSelector } from "../src/types/types";

test("Use modelizer to add a difference column.", async () => {
  const selector = <DataTagSelector>[
    [
      {
        category: "variable",
        value: "Q12",
      },
      {
        category: "subgroup",
        value: "Gender",
      },
    ],
  ];

  const query = await Query.run({
    dataTagSelector: selector,
  });

  const mod = query.modelizer;

  mod.getColumn("Difference").each((cell) => {
    const totalCell = cell.getRow().getCell("Total").toNumber();
    const vsCell = cell.getRow().getCell("female").toNumber();
    cell.setValue(totalCell - vsCell);
  });

  const diffs = mod.getColumn("Difference").collect();
  const fixture = [8, 15, -27];

  expect(diffs).toStrictEqual(fixture);
});
