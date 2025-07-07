import { vd } from "./helper";
import { Store } from "./store";
import { PrismaClient } from "./client";
import {
  Datasheet,
  ParserOptions,
  ParserType,
  RawResultData,
  RawResultMeta,
  SplitDatasheetsRule,
} from "./types/types";
import { Pspp } from "./parser/pspp";
import { Tagged } from "./parser/tagged";

const run = async () => {
  const tmpDir = `${__dirname}/../__test__/tmp`;
  const filename = `${__dirname}/../__test__/data/TestTagByFormat.xlsx`;

  const store = new Store(new PrismaClient(), {
    filename: filename,
    userId: 1,
    statusTracker: (status) => {
      // console.log(status.share);
    },
  });

  const config = <ParserOptions>{
    metaKey: "Basis:",
    totalLabel: "Gesamt",
    mapCategories: {
      section: "Variable",
      topic: "Info",
      vartitle: "Subtabelle",
    },
    metaMap: {},
    skipRows: [],
    tagsMarker: "@Tags",
    calculateConditionalStyle: true,
    renderRow: (row) => {
      return row.map((cell) => {
        if (cell === " ") {
          return null;
        } else {
          return cell;
        }
      });
    },
    renderLabel: (label) => {
      return label.trim();
    },
    renderTags: (info, tags) => {
      info.forEach((tag) => {
        let tagName = String(tag.value).trim();
        tags.push(tag.key, tagName);
      });
      return;
    },
    renderDatasheets: (datasheets: Datasheet[], parser: any) => {
      const stripMetaKeys = ["rowStyle"];
      const rules: SplitDatasheetsRule[] = [
        {
          matchMeta: {
            key: "rowStyle",
            value: (meta: RawResultMeta) => {
              const first = meta.info[0];
              return first?.info?.bgColor === "FFf2f2f2";
            },
          },
          method: "extractRows",
          tags: [
            {
              category: "Info",
              value: "Others",
            },
          ],
        },
        {
          matchMeta: {
            key: "rowStyle",
            value: (meta: RawResultMeta) => {
              const first = meta.info[0];
              return first?.info?.bgColor === "FFb3b1a9";
            },
          },
          method: "extractRows",
          tags: [
            {
              category: "Info",
              value: "Top Sender",
            },
          ],
        },
        {
          matchMeta: {
            key: "rowStyle",
            value: (meta: RawResultMeta) => {
              const first = meta.info[0];
              return first?.info?.bgColor === "FFfcd5b5";
            },
          },
          method: "extractRows",
          tags: [
            {
              category: "Info",
              value: "Super Sender",
            },
          ],
        },
      ];

      datasheets = parser.splitDatasheets(datasheets, rules);
      datasheets = parser.clearDatasheetMeta(datasheets, stripMetaKeys);

      return datasheets;
    },
  };

  const parse = new Tagged(config);
  const datasheets = await parse.fromXlsx(filename);
  vd(datasheets);

  // const summary = await store
  //   .run(datasheets)
  //   .then((summary) => {
  //     return summary;
  //   })
  //   .catch((e) => {
  //     throw e;
  //   })
  //   .finally(async () => {
  //     await store.prisma.$disconnect();
  //   });

  // vd(summary);
};

run()
  .then((result) => {})
  .catch((e) => {
    throw e;
  });
