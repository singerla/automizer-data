import { vd } from "./helper";
import { runQuery } from "./index";
import Modelizer from "./modelizer";

const run = async () => {
  const result1 = await runQuery({ selector: [[2, 4]], merge: false });
  const result2 = await runQuery({ selector: [[2, 3]], merge: false });

  const model = new Modelizer();

  model.addPoints(result2.points, {
    rowKey: (point) => point.row,
    colKey: (point) => point.column,
  });

  // model.addPoints(
  //   result1.points,
  //   (point) => point.row,
  //   (point) => point.column
  // );

  // model.addRow("answer 16");
  // model.addRow("answer 12");
  //

  // model.dump(16, 16);

  // const testColId = model.addColumn("test");
  // const testColId2 = model.addColumn("test2");
  // model.render((cell, r, c) => {
  //   cell.value = cell.getValue() + " " + cell.points.length;
  // });

  model.setCellValue(0, "Total", "test");
  model.dump();

  // model.getCell(2, 1).dump();
  //
  // model.processRows((row) => {
  //   const cell1 = row.getCell("19-29").toNumber();
  //   const cell2 = row.getCell("Total").toNumber();
  //   row
  //     .setCellValue("test", cell1 - cell2)
  //     .setCellValue("test2", cell2 - cell1);
  //
  //   const cell3 = row.getCell("test2").toNumber();
  //   const cell4 = row.getCell(2).toNumber();
  //   // row.getCell(2).dump();
  //   row.setCellValue("40-69", cell3 - cell4);
  //
  //   row.setCellValue;
  // });
  //
  // model.getColumn(testColId).dump();
  // model.getRow("answer 1").dump();
  //

  // model.getCell("answer 1", "male");
  // model.setCellValue("answer 1", "male", 100);
  // // model.render((cell, r, c) => {
  // //   cell.value = cell.getValue() + " " + cell.points.length;
  // // });
  //
  // model.dump(16, 16, [0, 1, 2], [0, testColId, "40-69", "male"]);
  // const chartData = result.toSeriesCategories();

  // model.addRow("test row");
  // model.processColumns((column) => {
  //   const cell1 = column.getCell("answer 1").toNumber();
  //   const cell2 = column.getCell("answer 2").toNumber();
  //   column.setCellValue("test row", cell1 + cell2);
  // });

  //
  // model.getRow("test row").cells.forEach((cell) => {
  //   const value = cell.getValue();
  //   cell.setValue(value + "test");
  // });

  // model.getColumn("Total").cells.forEach((cell) => {
  //   const quId = cell.getPoint(0).getTag(100).value;
  //   cell.setValue(quId + " m");
  // });
  //
  // model.getColumn("test 3").cells.forEach((cell) => {
  //   cell.setValue(cell.col + " " + cell.row);
  // });
  //
  // model.sort("col", ["test2", "Total", "test 3"]);

  // const sortRow = "test row";
  // const keys = model.exportKeys("col");
  //
  // const sort = keys.sort((a, b) => {
  //   const rowA = model.getCell(sortRow, a).toNumber();
  //   const rowB = model.getCell(sortRow, b).toNumber();
  //   return rowB - rowA;
  // });

  // vd(sort);
  // model.dump(16, 16);

  // model.sort("col", sort);

  // model.dump(16, 16);
  // console.dir(chartData, { depth: 10 });
};

run()
  .then((result) => {})
  .catch((e) => {
    throw e;
  });
