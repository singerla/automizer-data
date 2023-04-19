import { Query } from "../src";

test("Use modelizer to add a difference row.", async () => {
  const selector = [
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

  // const fixture = [];
  //
  // expect(diffs).toStrictEqual(fixture);
});
