import { vd } from "./helper";
import { Store } from "./store";
import { PrismaClient } from "./client";
import { ParserOptions, RawResultInfo, Tagger } from "./types/types";
import { Gesstabs } from "./parser/gesstabs";
import { PSPP } from "./parser/pspp";

const run = async () => {
  const tmpDir = `${__dirname}/../__test__/tmp`;
  const filename = `/home/tsing/Schreibtisch/survey_937949_spss(1).sav`;

  const store = new Store(new PrismaClient(), {
    filename: filename,
    userId: 1,
    statusTracker: (status) => {
      // console.log(status.share);
    },
  });

  const config = <ParserOptions>{
    spsTmpDir: tmpDir,
    spsCommands: [
      {
        command: "CROSSTABS",
        varDep: "G01Q02",
        varIndep: "G01Q05",
      },
      {
        command: "CROSSTABS",
        varDep: "G01Q02",
        varIndep: "G01Q01",
      },
    ],
  };

  const parse = new PSPP(config);
  const datasheets = await parse.fromSav(filename);
  vd(datasheets);

  const summary = await store
    .run(datasheets)
    .then((summary) => {
      return summary;
    })
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await store.prisma.$disconnect();
    });

  vd(summary);
};

run()
  .then((result) => {})
  .catch((e) => {
    throw e;
  });
