import { PrismaClient } from "../src/client";
import { Store } from "../src/store";
import { WRITE_STORE_DB } from "./setup/dbConfig";

// Write to an isolated database so this import never pollutes the seeded read DB.
beforeAll(() => {
  process.env.DATABASE_URL = WRITE_STORE_DB;
});

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
