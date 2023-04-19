import { Query, ResultColumn } from "./index";
import { vd } from "./helper";
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

  queryResult.modelizer.getRow(2).getCell(1).getPoint().style = <TableRowStyle>{
    background: {
      type: "srgbClr",
      value: "cccccc",
    },
  };

  const toSeriesCategories = queryResult.convert().toSeriesCategories();
  const toVerticalLines = queryResult.convert().toVerticalLines();
  const toCombo = queryResult.convert().toCombo();
  const toScatter = queryResult.convert().toScatter();
  const toBubbles = queryResult.convert().toBubbles();
  const toTable = queryResult.convert().toTable();
  // const toResultRows = queryResult.convert().toResultRows();

  queryResult.modelizer.dump();

  queryResult.modelizer.sort("row", ["answer 3"]);
  queryResult.modelizer.sort("column", ["Total"]);

  queryResult.modelizer.dump();

  queryResult.modelizer.processRows((row) => {
    // vd(row.cells);
  });

  const toResultRows = queryResult.convert().toResultRows();

  // vd(toResultRows);

  //
  // vd(queryResult.modelizer.getKeys("row"));
  // vd(queryResult.inputKeys);
  //
  // queryResult.modelizer.dump();
};

run()
  .then((result) => {})
  .catch((e) => {
    throw e;
  });
