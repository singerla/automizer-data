import { PrismaClient } from './client';

import Query from './query';
import Points from './points';
import Convert from './convert';
import Modelizer from './modelizer/modelizer';
import Keys from './keys';

import { Store } from './store';
import TagsCache from './helper/tagsCache';
import { Parser } from './parser/parser';
import { Gesstabs } from './parser/gesstabs';
import { Pspp } from './parser/pspp';
import { MySQL } from './parser/mysql';
import { Generic } from './parser/generic';
import { Tagged } from './parser/tagged';

import {
  Cell,
  InputCategoryKeys,
  KeyMode,
  Model,
} from './modelizer/modelizer-types';
import {
  CachedObject,
  DataGrid,
  DataGridCategories,
  DataGridTransformation,
  DataPoint,
  DataPointFilter,
  DataPointMeta,
  DataPointModifier,
  DataResultCellFilter,
  DataTag,
  ICache,
  ITagsCache,
  IdSelector,
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
  ModelizeArguments,
  ModifierCommandArgument,
  NestedParentValue,
  ParserOptions,
  ParserOptionsPspp,
  QueryOptions,
  QueryResult,
  RawResultInfo,
  Result as ResultType,
  ResultCell,
  ResultColumn,
  ResultRow,
  Selector,
  StoreOptions,
  Tagger,
} from './types/types';

import { all, filterBy, filterByDataTag } from './filter';
import { dump, value } from './cell';
import { byColId } from './sort';
import { getNestedClause, getTagGroupsByCategory } from './helper';

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

export type {
  ParserOptions,
  ParserOptionsPspp,
  RawResultInfo,
  StoreOptions,
  Tagger,
};
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
  IdSelector,
  QueryOptions,
  ResultType,
  QueryResult,
};
export { Query, Parser, Gesstabs, Pspp, MySQL, Generic, Tagged, Store, filter, cell };
export { Points, Convert, Modelizer, Model, Keys };
export { TagsCache };
export { getNestedClause, getTagGroupsByCategory };
export { PrismaClient };

export type {
  CachedObject,
  ICache,
  ITagsCache,
  Cell,
  InputCategoryKeys,
  KeyMode,
  NestedParentValue,
  ModelizeArguments,
};
