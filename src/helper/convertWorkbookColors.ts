// Usage remains the same as before:
import ExcelJS from "exceljs";
import { extractThemeColorsFromXML } from "./themeParser";

export interface ExcelColor {
  indexed?: number;
  theme?: number;
  tint?: number;
  argb?: string;
}

export type ColorConverter = (color: ExcelColor) => string;

export function createColorConverter(
  workbook: ExcelJS.Workbook,
  indexedColors: string[]
): ColorConverter {
  const workbookThemeColors = extractThemeColorsFromXML(workbook);

  return function convertToARGB(color: {
    indexed?: number;
    theme?: number;
    tint?: number;
    argb?: string;
  }): string {
    if (color.argb) {
      return color.argb;
    }

    if (color.indexed !== undefined && color.indexed < indexedColors.length) {
      return indexedColors[color.indexed];
    }

    if (color.theme !== undefined && color.theme < workbookThemeColors.length) {
      let argb = workbookThemeColors[color.theme];

      if (color.tint) {
        argb = applyTint(argb, color.tint);
      }

      return argb;
    }

    return "FF000000";
  };
}

function applyTint(argb: string, tint: number): string {
  // Convert ARGB to RGB components
  const alpha = argb.substr(0, 2);
  const red = parseInt(argb.substr(2, 2), 16);
  const green = parseInt(argb.substr(4, 2), 16);
  const blue = parseInt(argb.substr(6, 2), 16);

  // Apply tint transformation
  const rgb = [red, green, blue].map((color) => {
    if (tint < 0) {
      // Darken
      return Math.round(color * (1 + tint));
    } else {
      // Lighten
      return Math.round(color + (255 - color) * tint);
    }
  });

  // Convert back to ARGB
  return (
    alpha +
    rgb[0].toString(16).padStart(2, "0") +
    rgb[1].toString(16).padStart(2, "0") +
    rgb[2].toString(16).padStart(2, "0")
  );
}
