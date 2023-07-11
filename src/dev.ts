import { vd } from "./helper";
import { Store } from "./store";
import { PrismaClient } from "./client";
import { ParserOptions } from "./types/types";
import { PSPP } from "./parser/pspp";

const run = async () => {
  const tmpDir = `${__dirname}/../__test__/tmp`;
  const filename = `${__dirname}/../__test__/data/test-data.sav`;

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
      keys: {
        skipKeys: ["Table: Zusammenfassung"],
        valueKey: "Spalte %",
        tableKey: "Table: ",
        totalKey: "Gesamt",
        totalLabel: "TOTAL",
      },
      filters: [
        {
          category: "vartitle",
          value: "Very busy",
          key: "veryBusy",
          selectIf: "Q03=1 OR Q03=2",
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
