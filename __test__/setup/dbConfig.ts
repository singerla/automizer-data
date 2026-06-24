import * as path from "path";

// Isolated sqlite databases used by the test suite. Kept out of the way of the
// developer's prisma/dev.db so running tests never touches real data.
export const TMP_DIR = path.resolve(__dirname, "..", ".tmp");

// Seeded once with a single clean import of test-data.json. The query/modelize
// tests assert against the deterministic auto-increment ids this produces, so
// nothing else may write to it.
export const READ_DB = "file:" + path.join(TMP_DIR, "read.db");

// Fresh databases (only a User record) for the two store tests, so their writes
// never perturb the ids the read tests depend on.
export const WRITE_STORE_DB = "file:" + path.join(TMP_DIR, "write-store.db");
export const WRITE_XLSX_DB = "file:" + path.join(TMP_DIR, "write-xlsx.db");
