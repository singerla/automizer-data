import { Query } from "../src";
import { vd } from "../src/helper";
import QueryCache from "../src/helper/queryCache";

const cache = new QueryCache();

test("Use modelizer along with QueryCache.", async () => {
  const queryResult = await Query.run({
    selector: [[5, 1, 2]],
    cache,
  });

  const mod = queryResult.modelizer;

  mod.getColumn("Difference").each((cell) => {
    const totalCell = cell.getRow().getCell("Total").toNumber();
    const vsCell = cell.getRow().getCell("female").toNumber();
    cell.setValue(totalCell - vsCell);
  });

  const diffs = mod.getColumn("Difference").collect();
  const fixture = [8, 15, -27];
  const diffs2 = mod.getColumn("Difference").collect();
  mod.dump();
});
