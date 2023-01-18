import { vd } from "./helper";
import { runQuery } from "./index";
import Modelizer from "./modelizer";

const run = async () => {
  // const result1 = await runQuery({ selector: [[2, 4]], merge: false });
  const result2 = await runQuery({ selector: [[2, 3]], merge: false });

  const model = new Modelizer();

  model.addPoints(
    result2.points,
    (point) => point.row,
    (point) => point.column
  );

  // model.addPoints(
  //   result1.points,
  //   (point) => point.row,
  //   (point) => point.column
  // );

  // model.addRow("answer 16");
  // model.addRow("answer 12");
  //

  const testColId = model.addColumn("test");
  model.render((cell, r, c) => {
    cell.value = cell.getValue() + " " + cell.points.length;
  });

  model.dump(16, 16);

  model.process((model: Modelizer) => {
    model.rowKeys.forEach((rowKey, r) => {
      const cell1 = model.getCell(r, 1);
      const cell2 = model.getCell(r, 2);
      const diff = cell1.toNumber() - cell2.toNumber();
      model.setCellValue(r, testColId, diff);
    });
  });

  model.render((cell, r, c) => {
    cell.value = cell.getValue() + " " + cell.points.length;
  });

  model.dump(16, 16);
  // const chartData = result.toSeriesCategories();

  // console.dir(chartData, { depth: 10 });
};

run().then((result) => {});
