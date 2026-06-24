// jest runs globalSetup outside the ts-jest transform pipeline, so register
// ts-node here to load the TypeScript seeding logic (and the project's src tree).
require("ts-node/register/transpile-only");
module.exports = require("./seed").default;
