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

  mod.getColumn("Difference").each((cell) => {
    const totalCell = cell.getRow().getCell("Total").toNumber();
    const vsCell = cell.getRow().getCell("female").toNumber();
    cell.setValue(totalCell - vsCell);
  });

  const diffs = mod.getColumn("Difference").collect();
  const fixture = [8, 15, -27];
  const diffs2 = mod.getColumn("Difference").collect();
  vd(mod.getCells().length);
  mod.dump();
};

run()
  .then((result) => {})
  .catch((e) => {
    throw e;
  });
