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
      const matchTag =
        {
          category: "Variable",
          value: "P1 6-9",
        }
      ;
      const method = "extractRows";
      const targetCategory = "Thema";
      const matchByBgColor = (color) => {
        return {
          key: "rowStyle",
            value: (meta) => {
              const first = meta.info[0];
              return first?.info?.bgColor === color;
            }
        }
      };

      const rules: SplitDatasheetsRule[] = [
        {
          matchMeta: matchByBgColor("FFf2f2f2"),
          matchTag,
          method,
          tags: [
            {
              category: targetCategory,
              value: "Others",
            },
          ],
        },
        {
          matchMeta: matchByBgColor("FFb3b1a9"),
          matchTag,
          method,
          tags: [
            {
              category: targetCategory,
              value: "Top",
            },
          ],
        },
        {
          matchMeta: matchByBgColor("FFfcd5b5"),
          matchTag,
          method,
          tags: [
            {
              category: targetCategory,
              value: "Schrott",
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
  vd(datasheets.length);

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
