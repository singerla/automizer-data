import { PrismaClient } from "./client";

import Query from "./query";
import Points from "./points";
import Result from "./result";

import { Store } from "./store";
import { Parser } from "./parser/parser";
import { Gesstabs } from "./parser/gesstabs";
import { Generic } from "./parser/generic";

import { all, filterBy, filterByDataTag } from "./filter";
import { dump, points, value } from "./cell";
import { byColId } from "./sort";
import { getNestedClause, getTagGroupsByCategory } from "./helper";

import {
  DataGrid,
  DataGridCategories,
  DataGridTransformation,
  DataPoint,
  DataPointFilter,
  DataPointMeta,
  DataPointModifier,
  DataPointSortation,
  DataResultCellFilter,
  DataTag,
  ModArgsAddMeta,
  ModArgsAddPointInfo,
  ModArgsAddToNew,
  ModArgsAddToOthers,
  ModArgsCalcDifference,
  ModArgsCalcSum,
  ModArgsCustom,
  ModArgsExclude,
  ModArgsFilter,
  ModArgsFilterNested,
  ModArgsMap,
  ModArgsRename,
  ModArgsStringTolabel,
  ModArgsTagTolabel,
  ModArgsTranspose,
  ModifierCommandArgument,
  ParserOptions,
  QueryOptions,
  RawResultInfo,
  ResultCell,
  ResultColumn,
  ResultRow,
  Selector,
  StoreOptions,
  Tagger,
} from "./types/types";

const cell = {
  value,
  dump,
};
const filter = {
  all,
  filterByDataTag,
  filterBy,
};
const sort = {
  byColId,
};

export type { ParserOptions, RawResultInfo, StoreOptions, Tagger };
export type { ResultColumn, ResultRow, ResultCell };
export type {
  DataGrid,
  DataGridCategories,
  DataPointFilter,
  DataPointMeta,
  DataResultCellFilter,
  DataGridTransformation,
  DataTag,
};
export type {
  ModifierCommandArgument,
  DataPointSortation,
  DataPoint,
  DataPointModifier,
  ModArgsCustom,
  ModArgsAddMeta,
  ModArgsAddPointInfo,
  ModArgsAddToOthers,
  ModArgsFilter,
  ModArgsFilterNested,
  ModArgsExclude,
  ModArgsMap,
  ModArgsRename,
  ModArgsStringTolabel,
  ModArgsTagTolabel,
  ModArgsTranspose,
  ModArgsAddToNew,
  ModArgsCalcDifference,
  ModArgsCalcSum,
  Selector,
};
export { Query, Parser, Gesstabs, Generic, Store, filter, cell };
export { Points, Result };
export { getNestedClause, getTagGroupsByCategory };
export { PrismaClient };
