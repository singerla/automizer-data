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
        value: "Age",
      },
    ],
  ];

  const query = await Query.run({
    dataTagSelector: selector,
  });

  const mod = query.modelizer;

  // Add a "Difference" column holding Total minus the "19-29" age group.
  const vsColumn = "19-29";
  mod.getColumn("Difference").each((cell) => {
    const totalCell = cell.getRow().getCell("Total").toNumber();
    const vsCell = cell.getRow().getCell(vsColumn).toNumber();
    cell.setValue(totalCell - vsCell);
  });

  const diffs = mod.getColumn("Difference").collect();
  // Golden values from the seeded demo data (Total - "19-29" per row).
  const fixture = [11, 20, -9, 6];

  expect(diffs).toStrictEqual(fixture);
});
