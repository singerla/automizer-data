import { vd } from "./helper";
import { Store } from "./store";
import { PrismaClient } from "./client";
import {
  Datasheet,
  ParserOptions,
  ParserType,
  RawResultData,
  RawResultMeta,
  SplitDatasheetsRule,
} from "./types/types";
import { Pspp } from "./parser/pspp";
import { Tagged } from "./parser/tagged";
import { Query } from "./index";

const run = async () => {
  const selector = [
    // [
    //   {
    //     category: "country",
    //     value: "data/Originaler Datensatz aus dem System_Beispiel.sav",
    //   },
    //   {
    //     category: "variable",
    //     value: "B1a_19",
    //   },
    //   {
    //     category: "subgroup",
    //     value: "B1a_20",
    //   },
    // ],
  ];

  const query = await Query.run({
    selector: [[1, 2, 4]],
    api: {
      driver: "DuckDB",
      endpoint: "http://localhost:5000/analyze",
      mapCategoryIds: {
        row: 1,
        column: 2,
        file: 3
      }
    },
  });
  const chartData = query.convert().toSeriesCategories();
};

run()
  .then((result) => {})
  .catch((e) => {
    throw e;
  });
