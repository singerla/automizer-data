import ExcelJS from "exceljs";
import { vd } from "../helper";

interface NumericRef {
  startColString: string;  // Original column letter (e.g., "A")
  endColString: string;    // Original column letter (e.g., "Z")
  startCol: number;        // Numeric column index (e.g., 1 for "A")
  endCol: number;          // Numeric column index (e.g., 26 for "Z")
  startRow: number;        // Row number
  endRow: number;          // Row number
}


interface ConditionalFormatting {
  ref: string;
  numericRef: NumericRef;
  rules: ConditionalFormattingRule[];
}

export interface CellStyle {
  fill?: {
    type?: string;
    pattern?: string;
    bgColor?: {
      indexed?: number;
      theme?: number;
      tint?: number;
      argb?: string;
    };
  };
  font?: {
    condense?: boolean;
    extend?: boolean;
    color?: {
      indexed?: number;
      argb?: string;
    };
  };
  alignment?: any;
  border?: any;
  numFmt?: any;
  protection?: any;
}

interface ConditionalFormattingRule {
  type: string;
  operator: string;
  priority: number;
  timePeriod?: any;
  percent?: any;
  bottom?: any;
  rank?: any;
  aboveAverage?: any;
  formulae: string[];
  style: CellStyle;
}

type RuleGroups = Map<
  string,
  {
    refs: string[];
    numericRefs: any[];
    rules: ConditionalFormattingRule[];
  }
>;

export function getRuleGroups(
  conditionalFormattings: ConditionalFormatting[]
): ConditionalFormatting[] {
  // Create a map to group similar rules
  const ruleGroups: RuleGroups = new Map();

  if (!conditionalFormattings || conditionalFormattings.length === 0) {
    return [];
  }

  // Process each formatting
  for (const formatting of conditionalFormattings) {
    // Create a fingerprint for each rule
    const ruleFingerprints = formatting.rules.map((rule) => {
      // Create a unique key for each rule excluding ref and priority
      return JSON.stringify({
        type: rule.type,
        operator: rule.operator,
        formulae: rule.formulae,
        style: rule.style,
        timePeriod: rule.timePeriod,
        percent: rule.percent,
        bottom: rule.bottom,
        rank: rule.rank,
        aboveAverage: rule.aboveAverage,
      });
    });

    // Create a fingerprint for the entire rule set
    const formattingKey = ruleFingerprints.sort().join("|");

    // Get or create a group for this rule set
    if (!ruleGroups.has(formattingKey)) {
      ruleGroups.set(formattingKey, {
        refs: [],
        numericRefs: [],
        rules: formatting.rules.map((rule) => ({ ...rule })), // Clone rules
      });
    }

    const numericRef = parseRangeRef(formatting.ref);
    // Add this ref to the group
    ruleGroups.get(formattingKey)!.numericRefs.push(numericRef);
    ruleGroups.get(formattingKey)!.refs.push(formatting.ref);
  }

  // Convert rule groups back to ConditionalFormatting[]
  const mergedFormattings: ConditionalFormatting[] = [];

  for (const group of ruleGroups.values()) {
    // Merge adjacent regions for each group
    const mergedRefs = mergeAdjacentRefs(group.numericRefs);

    // Create conditional formatting for each merged ref
    for (const mergedRef of mergedRefs) {
      mergedFormattings.push({
        ref: `${columnNumberToString(mergedRef.startCol)}${mergedRef.startRow}:${columnNumberToString(mergedRef.endCol)}${mergedRef.endRow}`,
        numericRef: mergedRef,
        rules: group.rules.map((rule, idx) => ({
          ...rule,
          priority: idx + 1 // Adjust priority if needed
        }))
      });
    }
  }

  return mergedFormattings;
}

/**
 * Merge adjacent numeric references
 */
function mergeAdjacentRefs(refs: NumericRef[]): NumericRef[] {
  if (refs.length <= 1) return refs;

  // Sort refs by start column and start row
  const sortedRefs = refs.sort((a, b) =>
    a.startCol !== b.startCol
      ? a.startCol - b.startCol
      : a.startRow - b.startRow
  );

  const mergedRefs: NumericRef[] = [sortedRefs[0]];

  for (let i = 1; i < sortedRefs.length; i++) {
    const lastMerged = mergedRefs[mergedRefs.length - 1];
    const currentRef = sortedRefs[i];

    // Check if references can be merged
    const canMergeColumns =
      currentRef.startCol <= lastMerged.endCol + 1 &&
      currentRef.startRow === lastMerged.startRow &&
      currentRef.endRow === lastMerged.endRow;

    const canMergeRows =
      currentRef.startCol === lastMerged.startCol &&
      currentRef.endCol === lastMerged.endCol &&
      currentRef.startRow <= lastMerged.endRow + 1;

    if (canMergeColumns) {
      // Extend the last merged ref's end column
      lastMerged.endCol = Math.max(lastMerged.endCol, currentRef.endCol);
    } else if (canMergeRows) {
      // Extend the last merged ref's end row
      lastMerged.endRow = Math.max(lastMerged.endRow, currentRef.endRow);
    } else {
      // Cannot merge, add as new ref
      mergedRefs.push(currentRef);
    }
  }

  return mergedRefs;
}

/**
 * Convert column number to Excel column string (1 -> A, 27 -> AA)
 */
function columnNumberToString(columnNumber: number): string {
  let columnString = '';
  let dividend = columnNumber;
  let modulo: number;

  while (dividend > 0) {
    modulo = (dividend - 1) % 26;
    columnString = String.fromCharCode(65 + modulo) + columnString;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnString;
}


/**
 * Parse an Excel range reference into its components
 */
function parseRangeRef(ref: string): NumericRef | null {
  // Split multiple ranges and just take the first one for now
  const rangeParts = ref.split(" ")[0];
  const [startRef, endRef] = rangeParts.split(":");

  if (!startRef) return null;

  // If no end reference, use start as end (single cell)
  const end = endRef || startRef;

  // Parse column letters and row numbers
  let startColString = "";
  let i = 0;
  while (i < startRef.length && /[A-Z]/i.test(startRef[i])) {
    startColString += startRef[i++];
  }
  const startRow = parseInt(startRef.substring(i));

  let endColString = "";
  i = 0;
  while (i < end.length && /[A-Z]/i.test(end[i])) {
    endColString += end[i++];
  }
  const endRow = parseInt(end.substring(i));

  if (isNaN(startRow) || isNaN(endRow)) return null;

  // Convert column letters to numeric indices
  const startCol = colToNumber(startColString);
  const endCol = colToNumber(endColString);

  return {
    startColString,
    endColString,
    startCol,
    endCol,
    startRow,
    endRow,
  };
}


/**
 * Convert Excel column letter to numeric index (A=1, B=2, Z=26, AA=27, etc.)
 */
const columnCache: { [key: string]: number } = {};

function colToNumber(col: string): number {
  if (columnCache[col] !== undefined) {
    return columnCache[col];
  }

  const length = col.length;
  let number = 0;

  for (let i = 0; i < length; i++) {
    number += (col.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
  }

  columnCache[col] = number;
  return number;
}

export function calculateCellConditionalStyle(
  cell: ExcelJS.Cell,
  conditionalFormattings: ConditionalFormatting[]
): CellStyle | null {
  // Get cell address (e.g., 'C15')
  const cellAddress = parseAddress(cell.address);
  const cellAddressNumeric = {
    row: cellAddress.row,
    col: colToNumber(cellAddress.col)
  }

  const cellValue = cell.value as number;

  // Find all conditional formatting rules that apply to this cell
  const applicableFormattings = conditionalFormattings.filter((formatting) => {
    return isAddressInRangeNumeric(cellAddressNumeric, formatting.numericRef);
  });

  if (applicableFormattings.length === 0) {
    return null;
  }

  // Get all matching rules sorted by priority (lower number = higher priority)
  const matchingRules: ConditionalFormattingRule[] = [];
  for (const formatting of applicableFormattings) {
    for (const rule of formatting.rules) {
      if (doesRuleMatch(rule, cellValue)) {
        matchingRules.push(rule);
      }
    }
  }

  if (matchingRules.length === 0) {
    return null;
  }

  // Sort by priority
  matchingRules.sort((a, b) => b.priority - a.priority);

  // Merge all matching styles, with higher priority rules overriding lower priority ones
  const resultStyle: CellStyle = {};

  for (const rule of matchingRules) {
    if (!rule.style) {
      continue;
    }
    if (rule.style.fill) resultStyle.fill = { ...rule.style.fill };
    if (rule.style.font) resultStyle.font = { ...rule.style.font };
    if (rule.style.alignment)
      resultStyle.alignment = { ...rule.style.alignment };
    if (rule.style.border) resultStyle.border = { ...rule.style.border };
    if (rule.style.numFmt) resultStyle.numFmt = rule.style.numFmt;
    if (rule.style.protection)
      resultStyle.protection = { ...rule.style.protection };
  }

  return resultStyle;
}

function parseAddress(address: string): { col: string; row: number } {
  let i = 0;
  while (
    i < address.length &&
    address.charCodeAt(i) >= 65 &&
    address.charCodeAt(i) <= 90
  ) {
    i++;
  }
  return {
    col: address.slice(0, i),
    row: parseInt(address.slice(i)),
  };
}

function parseRange(range: string): { start: string; end: string } {
  if (range.includes(":")) {
    const [start, end] = range.split(":");
    return { start, end };
  } else {
    // If there's no colon, it's a single cell reference
    return { start: range, end: range };
  }
}

function isAddressInRange(address: string, rangeStr: string): boolean {
  // Split multiple ranges by space and check each range
  const ranges = rangeStr.split(" ");

  return ranges.some((range) => {
    // Before attempting to parse start and end, check if the range contains a colon
    // If not, treat it as a single cell reference (start = end)
    const { start, end } = parseRange(range);

    // Parse addresses without regex
    const cell = parseAddress(address);
    const startAddr = parseAddress(start);
    const endAddr = parseAddress(end);

    // Convert columns only once and use cached values
    const cellColNum = colToNumber(cell.col);
    const startColNum = colToNumber(startAddr.col);
    const endColNum = colToNumber(endAddr.col);

    // Check if cell is within this range
    return (
      cellColNum >= startColNum &&
      cellColNum <= endColNum &&
      cell.row >= startAddr.row &&
      cell.row <= endAddr.row
    );
  });
}

/**
 * Check if a numeric address is within a specified range.
 *
 * @param address - The address to check, in the form { col: number, row: number }.
 * @param range - The range to check against, represented as a NumericRef.
 * @returns True if the address is within the range, false otherwise.
 */
function isAddressInRangeNumeric(
  address: { col: number; row: number },
  range: NumericRef
): boolean {
  // Check if the column and row of the address fall within the range
  return (
    address.col >= range.startCol &&
    address.col <= range.endCol &&
    address.row >= range.startRow &&
    address.row <= range.endRow
  );
}


function doesRuleMatch(
  rule: ConditionalFormattingRule,
  cellValue: number
): boolean {
  if (typeof cellValue !== "number") return false;

  const compareValue = parseFloat(rule.formulae[0]);

  switch (rule.operator) {
    case "greaterThanOrEqual":
      return cellValue >= compareValue;
    case "lessThan":
      return cellValue < compareValue;
    case "equal":
      return cellValue === compareValue;
    case "notEqual":
      return cellValue !== compareValue;
    case "greaterThan":
      return cellValue > compareValue;
    case "lessThanOrEqual":
      return cellValue <= compareValue;
    // Add more operators as needed
    default:
      return false;
  }
}
