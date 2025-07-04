import { vd } from "./helper";
import { Store } from "./store";
import { PrismaClient } from "./client";
import { ParserOptions } from "./types/types";
import { Pspp } from "./parser/pspp";
import { Tagged } from "./parser/tagged";

const run = async () => {
  const tmpDir = `${__dirname}/../__test__/tmp`;
  const filename = `${__dirname}/../__test__/data/test.xlsx`;

  const store = new Store(new PrismaClient(), {
    filename: filename,
    userId: 1,
    statusTracker: (status) => {
      // console.log(status.share);
    },
  });

  const config = <ParserOptions>{
    metaKey: 'Basis:',
    totalLabel: 'Gesamt',
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
      return row.map(cell => {
        if(cell === ' ') {
          return null
        } else {
          return cell;
        }
      })
    },
    renderLabel: (label) => {
      return label.trim()
    },
    renderTags: (info, tags) => {
      info.forEach(tag => {
        let tagName = String(tag.value).trim();
        tags.push(tag.key, tagName);
      });
      return;
    }
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
