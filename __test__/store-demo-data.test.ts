import { PrismaClient } from "../src/client";
import { Store } from "../src/store";

test("store demo data with prisma client", async () => {
  const data = require("./data/test-data.json");

  const store = new Store(new PrismaClient());

  const summary = await store
    .run(data)
    .then((summary) => {
      return summary;
    })
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      // await store.prisma.$disconnect()
    });

  expect(summary.ids.length).toBe(data.length);
});
