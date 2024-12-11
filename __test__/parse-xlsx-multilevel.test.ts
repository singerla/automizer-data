import { PrismaClient } from "../src/client";
import { Store } from "../src/index";
import {
  ParserOptions,
  Tagger,
  RawResultInfo,
  StatusTracker,
  RawTable,
  ParserType,
  RawResultData,
} from "../src/types/types";
import { Gesstabs } from "../src/parser/gesstabs";
import { vd } from "../src/helper";

// Progress bar is not available inside a running test.
const cliProgress = require("cli-progress");

test("parse demo xlsx-data from Gesstabs and split multilevel column header into tags", async () => {
  const filename = `${__dirname}/data/test-data.xlsx`;

  const config = <ParserOptions>{
    // This string separates tables if found in Column A
    separator: "Table Separator",
    // A row that fits to any of the strings below will be
    // separated into "meta"-field if found in Col A
    metaMap: {
      base: ["BASE"],
      topBox: ["Top-2-Box (1-2)"],
      bottomBox: ["Bottom-2-Box (4-5)"],
      mean: ["Mean Value"],
    },
    // Rows that equal to one of the labels below will be skipped.
    skipRows: ["company", "* Annotation", "(Sum of answers)"],
    // On multilevel headers, a callback can tag the other levels.
    // On single level headers, the value will be of category "subgroup"
    renderHeaderTags: (
      labels: string[],
      table: RawTable,
      parser: ParserType
    ) => {
      const tags = [];
      const levels = ["topLevelCategory", "subgroup"];
      labels.forEach((label, l) => {
        tags.push(parser.getTag(levels[l], label));
      });
      return tags;
    },
    renderRawResultData: (data: RawResultData, parser: ParserType) => {
      data.header[1][4] += " (2)";
    },
    // A callback function to be applied to every body row
    renderRow: (row: string[]): (number | null)[] => {
      return row.map((cell) => {
        if (cell === " ") return null;
        else return Number(cell);
      });
    },
    // The info array of each sub-table will be passed to this
    // callback. Tagging can be fine tuned here.
    renderTags: (info: RawResultInfo[], tags: Tagger): void => {
      info.forEach((info, level) => {
        let cat;
        // info.key contains the info string's original section
        // could be 'body' or 'info'
        if (info.key === "body") {
          cat = "vartitle";
        } else if (info.value.indexOf("- ") === 0) {
          cat = "measure";
        } else if (level === 0) {
          // We strip the table separator and pass CountryName
          info.value = info.value.replace("Table Separator – ", "");
          cat = "country";
        } else if (level === 1) {
          cat = "variable";
        } else if (level === 2) {
          cat = "questionText";
        }
        if (cat) {
          tags.push(cat, info.value);
        }
      });
    },
  };

  const parse = new Gesstabs(config);
  const datasheets = await parse.fromXlsx(filename);
  const tags = datasheets[1].tags;
  expect(tags.length).toBe(6);
  expect(tags[4].category).toBe("topLevelCategory");
});
