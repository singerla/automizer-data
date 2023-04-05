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

  const query = await Query.run({ dataTagSelector });

  // query.modelizer.getRow(2).getCell(1).getPoint().style = <TableRowStyle>{
  //   background: {
  //     type: "srgbClr",
  //     value: "cccccc",
  //   },
  // };
  const toSeriesCategories = new Convert(query).toSeriesCategories();
  const toVerticalLines = new Convert(query).toVerticalLines();
  const toCombo = new Convert(query).toCombo();
  const toScatter = new Convert(query).toScatter();
  const toBubbles = new Convert(query).toBubbles();
  const toTable = new Convert(query).toTable();
  const toResultRows = new Convert(query).toResultRows();

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
