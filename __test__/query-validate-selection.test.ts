import { Query } from "../src";
import { Tag } from "@prisma/client";

test("Select demo data, validate selection and convert to SeriesCategories", async () => {
  const dataTagSelector = [
    [
      {
        category: "country",
        value: "Norway",
      },
      {
        category: "variable",
        value: "Q12",
      },
    ],
  ];

  const requiredCategoryIds = [1, 2];
  const checker = (existing: number[], required: number[]) =>
    required.every((v) => existing.includes(v));

  const selectionValidator = (tags: Tag[]) => {
    return checker(
      tags.map((tag) => tag.categoryId),
      requiredCategoryIds
    );
  };

  const query = await Query.run({ dataTagSelector, selectionValidator });
  const chartData = query.convert().toSeriesCategories();

  expect(chartData.series.length).toBe(4);
  expect(chartData.categories.length).toBe(3);
});
