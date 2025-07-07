import ExcelJS from "exceljs";

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
  formulae: string[];
  style: CellStyle;
  priority: number;
}

interface ConditionalFormatting {
  ref: string;
  rules: ConditionalFormattingRule[];
}

export function calculateCellConditionalStyle(
  cell: ExcelJS.Cell,
  conditionalFormattings: ConditionalFormatting[]
): CellStyle | null {
  // Get cell address (e.g., 'C15')
  const cellAddress = cell.address;
  const cellValue = cell.value as number;

  // Find all conditional formatting rules that apply to this cell
  const applicableFormattings = conditionalFormattings.filter((formatting) => {
    return isAddressInRange(cellAddress, formatting.ref);
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

function isAddressInRange(address: string, rangeStr: string): boolean {
  // Split multiple ranges by space and check each range
  const ranges = rangeStr.split(" ");

  return ranges.some((range) => {
    // Split single range into start and end addresses
    const [start, end] = range.split(":");

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
