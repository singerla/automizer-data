import { Tag } from "../src/client";
import {
  NestedClause,
  NestedClauseTagGroup,
  PrismaId,
  QueryOptions,
} from "./types/types";

export const getNestedClause = (selectionTags: Tag[]): NestedClause | false => {
  const tagGroups = getTagGroupsByCategory(selectionTags);

  if (!tagGroups || !tagGroups[0]) {
    return false;
  }

  let clause = clauseCallback(tagGroups[0]);
  for (let i in tagGroups) {
    if (Number(i) > 0) {
      setNestedClause(clause, tagGroups[i]);
    }
  }

  return clause;
};

export const getTagGroupsByCategory = (selectionTags: Tag[]): PrismaId[][] => {
  const groups = <NestedClauseTagGroup>{};
  selectionTags.forEach((tag) => {
    if (!tag || tag.categoryId === undefined) {
      return;
    }
    if (!groups[tag.categoryId]) {
      groups[tag.categoryId] = [];
    }
    if (!groups[tag.categoryId].includes(tag.id)) {
      groups[tag.categoryId].push(tag.id);
    }
  });
  return Object.values(groups);
};

/**
 * Groups tags by their category types (row, column, file).
 * Uses category IDs to identify which tags belong to which group.
 *
 * @param tags - Array of tags to be grouped
 * @param categoryMapping - Mapping of category IDs to types (row, column, file)
 * @returns An object containing grouped tags by type
 */
export function extractTagGroups(
  tags: Tag[],
  categoryMapping: QueryOptions["api"]["mapCategoryIds"]
): {
  row: Tag[];
  column: Tag[];
  file: Tag[];
} {
  // Initialize result with empty arrays
  const result = {
    row: [] as Tag[],
    column: [] as Tag[],
    file: [] as Tag[],
  };

  // Destructure category IDs from the mapping
  const {
    row: rowCatId,
    column: columnCatId,
    file: fileCatId,
  } = categoryMapping;

  // Group tags by their category IDs
  tags.forEach((tag) => {
    if (tag.categoryId === rowCatId) {
      result.row.push(tag);
    } else if (tag.categoryId === columnCatId) {
      result.column.push(tag);
    } else if (tag.categoryId === fileCatId) {
      result.file.push(tag);
    }
    // Tags with other category IDs are ignored
  });

  return result;
}

export function extractFilterTags(
  tags: Tag[],
  categoryMapping: QueryOptions["api"]["mapFilterTags"]
): string {
  const clause = [];

  const filterTags = [];
  const usedCategories = [];
  categoryMapping.forEach((categoryMap) => {
    const selected = tags.find(
      (tag) =>
        tag.name === categoryMap.label &&
        categoryMap.categoryId === tag.categoryId
    );
    if (selected) {
      usedCategories.push(categoryMap.categoryId);
      filterTags.push({
        categoryMap,
        selected,
      });
    }
  });

  usedCategories.forEach((categoryId) => {
    const variableConditions = filterTags
      .filter((filterTag) => filterTag.categoryMap.categoryId === categoryId)
      .map(
        (filterTag) =>
          `${filterTag.categoryMap.variable} = '${filterTag.categoryMap.code}'`
      )
      .join(" OR ");
    clause.push(variableConditions);
  });

  return clause.join(" AND ");
}

/**
 * Generates all possible combinations of row, column, and file tags.
 * Takes the grouped tags from extractTagGroups and returns an array of all possible combinations.
 *
 * @param groupedTags - Object containing row, column, and file tags
 * @returns Array of combinations, each containing one row, one column, and one file tag
 */
export function generateTagCombinations(groupedTags: {
  row: Tag[];
  column: Tag[];
  file: Tag[];
}): { row: Tag; column: Tag; file: Tag }[] {
  const { row, column, file } = groupedTags;
  const combinations: { row: Tag; column: Tag; file: Tag }[] = [];

  // Generate all possible combinations
  for (const rowTag of row) {
    for (const columnTag of column) {
      for (const fileTag of file) {
        combinations.push({
          row: rowTag,
          column: columnTag,
          file: fileTag,
        });
      }
    }
  }

  return combinations;
}

export const clauseCallback = (ids: PrismaId[]): NestedClause => {
  const selector = ids.length > 1 ? { in: ids } : ids[0];
  return {
    tags: {
      some: {
        id: selector,
      },
    },
  };
};

export const setNestedClause = (clause: any, ids: number[]): void => {
  if (!clause.AND) {
    clause.AND = clauseCallback(ids);
  } else {
    setNestedClause(clause.AND, ids);
  }
};

export const vd = (v: any, keys?: boolean): void => {
  if (keys && typeof v === "object") {
    v = Object.keys(v);
  }
  console.log("--------- [automizer-data] ---------");
  // @ts-ignore
  console.log(new Error().stack.split("\n")[2].trim());
  console.dir(v, { depth: 10 });
  console.log();
};
