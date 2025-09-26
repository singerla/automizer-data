import { Query } from "./index";

const run = async () => {
  const query = await Query.run({
    selector: [[1, 2, 4]],
    api: {
      driver: "DuckDB",
      endpoint: "http://localhost:5000/analyze",
      variableCategoryId: 7,
      splitCategoryId: 22,
      mapCategoryIds: [
        {
          key: "country",
          id: 1,
        },
        {
          key: "wave",
          id: 19,
        },
        {
          key: "category",
          id: 15,
        },
        {
          key: "retailer",
          id: 14,
        },
        {
          key: "attribute",
          id: 17,
        },
        {
          key: "type",
          id: 16,
        },
      ],
    },
  });
  const chartData = query.convert().toSeriesCategories();
};

run()
  .then((result) => {})
  .catch((e) => {
    throw e;
  });
