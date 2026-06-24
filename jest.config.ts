module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverageFrom: ["src/{!(pretty),}.js"],
  // Builds isolated, seeded sqlite test databases once before the suite.
  globalSetup: "<rootDir>/__test__/setup/globalSetup.js",
  // Points every test at the seeded read-only database by default.
  setupFiles: ["<rootDir>/__test__/setup/setEnv.ts"],
  // sqlite allows a single writer; run serially to keep store tests deterministic.
  maxWorkers: 1,
};
