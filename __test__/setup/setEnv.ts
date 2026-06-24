import { READ_DB } from "./dbConfig";

// Runs in every jest worker before any test module is imported. Setting
// DATABASE_URL here (before @prisma/client loads .env, which never overrides an
// existing value) makes the default PrismaClient connect to the seeded read DB.
// Store tests override this in their own beforeAll.
process.env.DATABASE_URL = READ_DB;
