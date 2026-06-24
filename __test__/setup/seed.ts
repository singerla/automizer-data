import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { TMP_DIR, READ_DB, WRITE_STORE_DB, WRITE_XLSX_DB } from "./dbConfig";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

// A throwaway User every Import is connected to (Store defaults to userId: 1).
const SEED_USER = { id: 1, email: "test@example.com", name: "Test User" };

// Creates the schema in an isolated, empty sqlite file. The file is deleted
// first so `db push` builds it from scratch (no destructive reset needed).
function resetDb(url: string): void {
  const file = url.replace("file:", "");
  if (fs.existsSync(file)) fs.unlinkSync(file);
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: PROJECT_ROOT,
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
}

export default async function globalSetup(): Promise<void> {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  resetDb(READ_DB);
  resetDb(WRITE_STORE_DB);
  resetDb(WRITE_XLSX_DB);

  // Require lazily so DATABASE_URL is read at construction time, per database.
  const { PrismaClient } = require("../../src/client");
  const { Store } = require("../../src/store");

  // Read DB: User + exactly one import of the demo data. Doing it once against an
  // empty database reproduces the deterministic ids the read tests assert on.
  process.env.DATABASE_URL = READ_DB;
  const readPrisma = new PrismaClient();
  await readPrisma.user.create({ data: SEED_USER });
  const data = require("../data/test-data.json");
  await new Store(readPrisma, { statusTracker: () => {} }).run(data);
  await readPrisma.$disconnect();

  // Write DBs: only a User, so the store tests can connect their Imports.
  for (const url of [WRITE_STORE_DB, WRITE_XLSX_DB]) {
    process.env.DATABASE_URL = url;
    const prisma = new PrismaClient();
    await prisma.user.create({ data: SEED_USER });
    await prisma.$disconnect();
  }
}
