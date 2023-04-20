import { Query, ResultColumn } from "./index";
import { vd } from "./helper";
import { TableRowStyle } from "pptx-automizer/dist";
import QueryCache from "./helper/queryCache";

const cache = new QueryCache();

const run = async () => {
  vd("Cache buffer: " + cache.buffer.length);

  const queryResult = await Query.run({
    selector: [[5, 1, 2]],
    cache,
  });

  vd("Cache buffer: " + cache.buffer.length);

  const mod = queryResult.modelizer;
  vd(mod.getCells().length);

  // const point = mod.getRow(2).getCell(1).getPoint();
  // point.style = <TableRowStyle>{
  //   background: {
  //     type: "srgbClr",
  //     value: "cccccc",
  //   },
  // };
  // point.setMeta("testMeta", 123);
  // const resultRows1 = queryResult.convert().toResultRows();
  // vd(resultRows1[2].cols[1].value[0]);

  // mod.dump(20, 10, [], [], (cell) => {
  //   // return cell.getValue();
  //   return cell.getPoint().getMeta("testMeta")?.value;
  // });

  const queryResult2 = await Query.run({
    selector: [[5, 1, 2]],
    cache,
  });

  vd("Cache buffer: " + cache.buffer.length);
  const mod2 = queryResult2.modelizer;
  const point2 = mod2.getRow(2).getCell(1).getPoint();

  point2.setMeta("testMeta", 1234);

  // const point22 = mod2.getRow(2).getCell(1).getPoint();

  // vd(point2.getMeta("testMeta"));

  // mod2.dump(20, 10, [], [], (cell) => {
  //   // return cell.getValue();
  //   return cell.getPoint().getMeta("testMeta")?.value;
  // });
  //

  const resultRows = queryResult2.convert().toResultRows();
  vd(resultRows[2].cols[1].value[0]);

  // vd(mod2.getCells().filter((cell) => cell.rowKey === "answer 3"));

  mod2.processRows((row) => {
    row.cells().forEach((cell) => {
      // vd(cell.getPoints());
    });
  });

  // vd(mod2.getRow(2).getCell(1));

  // mod2.getCell("answer 3", "19-29").dump();
};

run()
  .then((result) => {})
  .catch((e) => {
    throw e;
  });
