// import { getPrismaClient } from "@prisma/client/runtime/library";
// import { PrismaClient } from "../../../ensemblio-api/prisma/client-project/index";
// import { Query } from "./index";
// import TagsCache from "./helper/tagsCache";
//
// const sourceSchema = 'ensemblio_nivea-innosuite-benchmarkdb'
// const sourceClient = new PrismaClient({
//   datasources: {
//     db: {
//       url: 'mysql://root:eehoofa@localhost/' + sourceSchema,
//     },
//   },
// }) as any;
//
// const run = async () => {
//   const tagsCache = new TagsCache();
//   await tagsCache.init(sourceClient, true);
//
//   const query = await Query.run({
//     prisma: sourceClient,
//     tagsCache,
//     selector: [[14, 41, 57]],
//     api: {
//       driver: "DuckDB",
//       endpoint: "http://localhost:5000/analyze",
//       variableCategoryId: 7,
//       splitCategoryId: 3,
//       apiCategoryId: null,
//       mapCategoryIds: [
//         {
//           "key": "country",
//           "id": 1,
//           "decode": true
//         },
//         {
//           "key": "category",
//           "id": 10,
//           "decode": true
//         },
//         {
//           "key": "wave",
//           "id": 11
//         },
//         {
//           "key": "number",
//           "id": 12
//         },
//         {
//           "key": "target",
//           "id": 13,
//           "decode": true
//         },
//         {
//           "key": "boost",
//           "id": 14,
//           "decode": true
//         },
//         {
//           "key": "gender",
//           "id": 15,
//           "decode": true
//         },
//         {
//           "key": "subcat",
//           "id": 16,
//           "decode": true
//         },
//         {
//           "key": "provider",
//           "id": 17,
//         },
//         {
//           "key": "brand",
//           "id": 18,
//         }
//       ]
//     },
//   });
//   // const chartData = query.convert().toSeriesCategories();
// };
//
// run()
//   .then((result) => {})
//   .catch((e) => {
//     throw e;
//   });
