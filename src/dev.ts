import { Query, Convert, Selector } from "./index";
import { vd } from "./helper";
import { CachedObject, CellKeys, Datasheet } from "./types/types";
import { Tag } from "./client";
import { TableRowStyle } from "pptx-automizer/dist";

const run = async () => {
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

  const queryResult = await Query.run({ dataTagSelector });

  // query.modelizer.getRow(2).getCell(1).getPoint().style = <TableRowStyle>{
  //   background: {
  //     type: "srgbClr",
  //     value: "cccccc",
  //   },
  // };

  const toSeriesCategories = queryResult.convert().toSeriesCategories();
  const toVerticalLines = queryResult.convert().toVerticalLines();
  const toCombo = queryResult.convert().toCombo();
  const toScatter = queryResult.convert().toScatter();
  const toBubbles = queryResult.convert().toBubbles();
  const toTable = queryResult.convert().toTable();
  const toResultRows = queryResult.convert().toResultRows();

  vd(toSeriesCategories);

  // vd(query.modelizer.getKeys("row"));
  // vd(query.modelizer.getInputKeys());

  // query.modelizer.dump();
};

run()
  .then((result) => {})
  .catch((e) => {
    throw e;
  });
