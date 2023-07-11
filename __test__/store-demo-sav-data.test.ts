import { PrismaClient } from "../src/client";
import { Store } from "../src/index";
import {
  ParserOptions,
  Tagger,
  RawResultInfo,
  StatusTracker,
} from "../src/types/types";
import { Gesstabs } from "../src/parser/gesstabs";
import { Pspp } from "../src/parser/pspp";

test("store demo sav-data using PSPP and prisma client", async () => {
  const tmpDir = `${__dirname}/tmp`;
  const filename = `${__dirname}/data/test-data.sav`;

  const store = new Store(new PrismaClient(), {
    filename: filename,
    userId: 1,
    statusTracker: (status) => {
      // console.log(status.share);
    },
  });

  const config = <ParserOptions>{
    renderTags: null,
    renderRow: null,
    skipRows: null,
    metaMap: null,
    tmpDir: tmpDir,
    pspp: {
      binary: "/usr/bin/pspp",
      psppLanguage: "de",
      filters: [
        {
          category: "vartitle",
          value: "Very busy",
          key: "veryBusy",
          selectIf: "Q03=1 OR Q03=2",
        },
      ],
      addTags: [
        {
          category: "country",
          value: "Country A",
        },
      ],
      commands: [
        {
          rowVar: "Q02",
          columnVars: ["Q05"],
        },
        {
          rowVar: "Q02",
          columnVars: ["Q05"],
          filters: ["veryBusy"],
        },
        {
          rowVar: "Q02",
          columnVars: ["Q01", "Q03"],
        },
        {
          rowVar: "Q02",
          columnVars: ["Q01", "Q03"],
          filters: ["veryBusy"],
        },
      ],
      labels: [
        {
          section: "columns",
          replace:
            "Ich komme überhaupt nicht zurecht und benötige Unterstützung bei der Nutzung von PowerPoint.",
          by: "Neuling",
        },
        {
          section: "columns",
          replace:
            "Ich habe Schwierigkeiten und würde gerne mehr über dessen Funktionen lernen wollen.",
          by: "Neugierig",
        },
        {
          section: "subgroup",
          replace: "Q01",
          by: "BUSINESS",
        },
        {
          section: "subgroup",
          replace: "Q03",
          by: "SEGMENTATION",
        },
      ],
    },
  };

  const parse = new Pspp(config);
  const datasheets = await parse.fromSav(filename);
  const summary = await store
    .run(datasheets)
    .then((summary) => {
      return summary;
    })
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      // await store.prisma.$disconnect();
    });

  expect(summary.ids.length).toBe(6);
});
