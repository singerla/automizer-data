import {
  RawResultData,
  DataTag,
  RawColumnSlice,
  ParserOptions,
  RawTable,
  Datasheet,
  RawRow,
  StoreSummary,
  ResultCell,
  RawResultMeta,
  RawResultNestedParent,
  RawResultNestedItem,
  RawResultInfo,
} from "../types";
import { vd } from "../helper";

export class Parser {
  results: RawResultData[];
  nested: RawResultNestedParent[];
  config: ParserOptions;
  currentSection: string;
  count: number;
  datasheets: Datasheet[];
  tableSeparator: string;
  file: string;

  constructor(config: ParserOptions) {
    this.results = <RawResultData[]>[];
    this.nested = <RawResultNestedParent[]>[];
    this.datasheets = <Datasheet[]>[];
    this.config = config;
    this.currentSection = "";
    this.count = -1;
    this.tableSeparator = "";
    this.file = "";
  }

  setDatasheets() {
    for (const r in this.results) {
      const table = <RawResultData>this.results[r];

      const tagsObj = {
        tags: <DataTag[]>[],
        push(cat: string, value: string) {
          this.tags.push({
            category: cat,
            value: value,
          });
        },
      };

      this.config.renderTags(table.info, tagsObj);
      const tags = tagsObj.tags;
      this.removeCategoryDuplicates(tags);

      if (this.config.renderRawResultData) {
        this.config.renderRawResultData(table, this);
      }

      if (!table.header.length) {
        return;
      }

      const slices = this.parseColumnSlices(table.header);
      const subgroups = this.sliceColumns(table, table.header, slices);

      subgroups.forEach((subgroup) => {
        const targetTags = [...tags];

        if (subgroup.label.length) {
          targetTags.push(this.getTag("subgroup", subgroup.label));
        }

        this.datasheets.push({
          tags: targetTags,
          columns: subgroup.columns,
          rows: subgroup.rows,
          data: subgroup.data,
          meta: subgroup.meta,
        });
      });
    }
  }

  getTag(category: string, value: string): DataTag {
    const tag = {
      category: category,
      value: value,
    };
    return tag;
  }

  removeCategoryDuplicates(tags: DataTag[]): void {
    type Counter = { [key: string]: number };
    const count = <Counter>{};
    const currentCount = <Counter>{};
    const increment = (counter: Counter, category: string) => {
      counter[category] = counter[category] ? counter[category] + 1 : 1;
    };

    tags.forEach((tag) => increment(count, tag.category));
    tags.forEach((tag) => {
      if (count[tag.category] > 1) {
        increment(currentCount, tag.category);
        if (currentCount[tag.category] > 1) {
          tag.category += "_" + String(currentCount[tag.category]);
        }
      }
    });
  }

  parseColumnSlices(header: RawRow[]): RawColumnSlice[] {
    const slices = <any>[];
    const countHeaderLevels = header.length;
    const bottomLevel = countHeaderLevels - 1;
    const lastValues = <any>{};
    const sliceKeys = <any>{};

    header[bottomLevel]?.forEach((value: ResultCell, colId: number) => {
      const upperValues = [];
      for (let level = 0; level < bottomLevel; level++) {
        if (
          typeof header[level][colId] !== "undefined" &&
          String(header[level][colId]).trim().length > 0
        ) {
          const upperValue = String(header[level][colId]);
          upperValues.push(upperValue);
          lastValues[level] = upperValue;
        } else if (lastValues[level]) {
          upperValues.push(lastValues[level]);
        } else {
          upperValues.push(value);
        }
      }

      const uniqueUpperValues = [...new Set(upperValues)];
      const sliceKey = uniqueUpperValues.join("|");
      if (!sliceKeys[sliceKey]) {
        sliceKeys[sliceKey] = <any>[];
      }

      sliceKeys[sliceKey].push(colId);
    });

    for (const sliceKey in sliceKeys) {
      slices.push({
        label: sliceKey,
        start: sliceKeys[sliceKey][0],
        end: sliceKeys[sliceKey][0] + sliceKeys[sliceKey].length,
      });
    }

    return slices;
  }

  sliceColumns(
    table: RawResultData,
    subgroupHeaders: RawRow[],
    slices: RawColumnSlice[]
  ) {
    const bottomLevel = subgroupHeaders.length - 1;
    const subgroupHeader = subgroupHeaders[bottomLevel];
    const body = table.body;
    const meta = table.meta;
    const nested = table.nested || [];

    const rawTables = <RawTable[]>[];
    slices.forEach((slice) => {
      const rawTable = <RawTable>{
        label: slice.label,
        rows: [],
        columns: [],
        data: [],
        meta: [],
      };

      this.renderHeader(subgroupHeader, slice, rawTable);
      this.renderBody(body, slice, rawTable);
      this.renderMeta(meta, slice, rawTable);
      this.renderNested(nested, rawTable);

      rawTables.push(rawTable);
    });
    return rawTables;
  }

  renderBody(body: RawRow[], slice: RawColumnSlice, rawTable: RawTable) {
    body.forEach((row) => {
      const rowArr = Object.values(row);
      let rowLabel = String(rowArr[0]);
      const sliced = rowArr.slice(slice.start + 1, slice.end + 1);
      if (this.config.renderLabel) {
        rowLabel = this.config.renderLabel(rowLabel);
      }
      rawTable.rows.push(rowLabel);
      rawTable.data.push(
        this.config.renderRow(sliced, rowLabel, rawTable.meta, this)
      );
    });
  }

  renderMeta(meta: RawResultMeta[], slice: RawColumnSlice, rawTable: RawTable) {
    meta.forEach((meta) => {
      rawTable.meta.push({
        key: meta.key,
        label: meta.label,
        data: meta.data?.slice(slice.start + 1, slice.end + 1),
      });
    });
  }

  renderHeader(
    subgroupHeader: RawRow,
    slice: RawColumnSlice,
    rawTable: RawTable
  ) {
    const colArr = Object.values(subgroupHeader);
    rawTable.columns = colArr
      .slice(slice.start, slice.end)
      .map((col) => String(col));

    if (this.config.renderHeader) {
      rawTable.columns = this.config.renderHeader(
        rawTable.columns,
        rawTable.meta,
        this,
        slice
      );
    }
  }

  renderNested(nested: RawResultNestedItem[], rawTable: RawTable) {
    nested.forEach((nestedItem) => {
      const nestedData = nestedItem.parents.map((parent) => parent.label);
      if (nestedData.length) {
        rawTable.meta.push({
          key: "nested",
          label: nestedItem.label,
          data: nestedItem.parents.map((parent) => parent.label),
        });
      }
    });
  }

  pushMeta = (
    label: string,
    key: string,
    info: RawResultInfo[],
    meta: RawResultMeta[]
  ) => {
    const existing = meta.find(
      (meta) => meta.label === label && meta.key === key
    );
    if (existing && existing.info) {
      existing.info.push(...info);
    } else {
      meta.push({
        label: label,
        key: key,
        info: info,
      });
    }
  };
}
