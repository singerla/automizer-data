import { Query } from "./index";
import { vd } from "./helper";

const run = async () => {
  const selector = [
    {
      category: "variable",
      value: "Q12",
    },
    {
      category: "subgroup",
      value: "Gender",
    },
  ];

  const query = await Query.run({
    selector,
    merge: true,
    useModelizer: true,
  });

  const mod = query.getModelizer();
  mod.strict = false;
  mod.getColumn("Difference").each((cell) => {
    const totalCell = cell.getRow().getCell("Total").toNumber();
    const vsCell = cell.getRow().getCell("female").toNumber();
    cell.setValue(totalCell - vsCell);
  });

  mod.dump();

  const is = [];
  mod.getColumn("Difference").each((cell) => {
    is.push(cell.toNumber());
  });

  const fixture = [8, 15, -27];

  // mod.setCellValue("answer 1", "Diff", "maika");
  //
  // const cb = function (cell: Cell) {
  //   const row = cell.getRow();
  //   const totalNumber = row.getCell("Total").toNumber();
  //   const vsNumber = row.getCell("19-29").toNumber();
  //
  //   cell.setValue(vsNumber - totalNumber);
  // };
  //
  // mod
  //   .getColumn("Diff")
  //   .each((cell) => {
  //     cell.getValue;
  //   })
  //   .dump(20, 10);
  //
  // // mod.dump();
  //
  // const expectedResult = [-26, -20, 9, -26, -20, 9];

  // mod.addColumn("col 15");
  // mod.addColumn("col 16");
  // //mod.addColumn("Test 2");
  // mod.addRow("answer 16");
  // mod.setCellValue(0, "col 16", 103);

  // mod.getColumn("Total 1").each((cell) => {
  //   mod.setCellValue(cell.rowKey, "Test 2", cell.toNumber() + 1);
  // });
  //
  // // mod.getCell(0, "Total").getPoint().setMeta("base", 300);
  // mod
  //   .getRow(0)
  //   .each((cell) =>
  //     mod.setCellValue(
  //       "Base",
  //       cell.colKey,
  //       cell.getPoint().getMeta("base")?.value as string
  //     )
  //   );

  // mod.setCellValue("answer 1", "Total", "Test 123123123");
  // mod.addRow("answer 1123");
  // mod.addColumn("col 1123");
  //
  // mod.setCellValue("answer 1123", "col 1123", 3123);
  // mod.processRows((modelRow) => {
  //   modelRow.each((cell) => {
  //     // vd(cell);
  //   });
  // });
  //
  // mod.strict = false;
  // mod.getColumn("Total").each((cell) => {
  //   mod.setCellValue(cell.rowKey, "Test 2", cell.toNumber() + 1);
  // });

  // mod.dump();

  // const result1 = await runQuery({ selector: [[2, 4]], merge: false });
  // const result2 = await runQuery({ selector: [[2, 3]], merge: false });
  //
  // const model = new Modelizer();
  //
  // model.addPoints(result2.points, {
  //   rowKey: (point) => point.row,
  //   colKey: (point) => point.column,
  // });

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
  //
  // model.setCellValue(0, "Total", "test");
  // model.dump();
  //
  //

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
