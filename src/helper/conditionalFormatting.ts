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
  const applicableFormattings = conditionalFormattings.filter(formatting => {
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
    if (rule.style.alignment) resultStyle.alignment = { ...rule.style.alignment };
    if (rule.style.border) resultStyle.border = { ...rule.style.border };
    if (rule.style.numFmt) resultStyle.numFmt = rule.style.numFmt;
    if (rule.style.protection) resultStyle.protection = { ...rule.style.protection };
  }

  return resultStyle;
}

function isAddressInRange(address: string, rangeStr: string): boolean {
  // Split range into start and end addresses
  const [start, end] = rangeStr.split(':');

  // Convert addresses to column and row numbers
  const cellCol = address.match(/[A-Z]+/)[0];
  const cellRow = parseInt(address.match(/\d+/)[0]);

  const startCol = start.match(/[A-Z]+/)[0];
  const startRow = parseInt(start.match(/\d+/)[0]);
  const endCol = end.match(/[A-Z]+/)[0];
  const endRow = parseInt(end.match(/\d+/)[0]);

  // Check if cell is within range
  return (
    colToNumber(cellCol) >= colToNumber(startCol) &&
    colToNumber(cellCol) <= colToNumber(endCol) &&
    cellRow >= startRow &&
    cellRow <= endRow
  );
}

function colToNumber(col: string): number {
  let result = 0;
  for (let i = 0; i < col.length; i++) {
    result *= 26;
    result += col.charCodeAt(i) - 'A'.charCodeAt(0) + 1;
  }
  return result;
}

function doesRuleMatch(rule: ConditionalFormattingRule, cellValue: number): boolean {
  if (typeof cellValue !== 'number') return false;

  const compareValue = parseFloat(rule.formulae[0]);

  switch (rule.operator) {
    case 'greaterThanOrEqual':
      return cellValue >= compareValue;
    case 'lessThan':
      return cellValue < compareValue;
    case 'equal':
      return cellValue === compareValue;
    case 'notEqual':
      return cellValue !== compareValue;
    case 'greaterThan':
      return cellValue > compareValue;
    case 'lessThanOrEqual':
      return cellValue <= compareValue;
    // Add more operators as needed
    default:
      return false;
  }
}
