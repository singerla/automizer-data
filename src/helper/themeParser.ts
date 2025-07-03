import { DOMParser } from "@xmldom/xmldom";
import ExcelJS from "exceljs";
import { themeColors } from "./defaultThemeColors";

export function extractThemeColorsFromXML(
  workbook: ExcelJS.Workbook
): string[] {
  try {
    const themeXML = (workbook as any)._themes?.theme1;

    if (!themeXML) {
      console.warn("No theme XML found in workbook, using default theme");
      return themeColors;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(themeXML, "application/xml");

    // Get the color scheme elements
    const colorScheme = doc.getElementsByTagName("a:clrScheme")[0];
    if (!colorScheme) {
      return themeColors;
    }

    const extractedColors: string[] = [];

    // Helper function to extract color value from an element
    const getColorFromElement = (element: Element): string => {
      const ensureARGB = (color: string): string => {
        // Remove any '#' if present
        color = color.replace("#", "");
        // If it's 6 characters (RGB), add FF prefix for alpha channel
        if (color.length === 6) {
          return `FF${color}`;
        }
        // If it's already 8 characters (ARGB), return as is
        if (color.length === 8) {
          return color;
        }
        // For any other cases, pad with F's to make it valid ARGB
        return "FF000000";
      };

      // Check for RGB color (srgbClr)
      const srgbClr = element.getElementsByTagName("a:srgbClr")[0];
      if (srgbClr && srgbClr.getAttribute("val")) {
        return ensureARGB(srgbClr.getAttribute("val")!);
      }

      // Check for system color (sysClr)
      const sysClr = element.getElementsByTagName("a:sysClr")[0];
      if (sysClr && sysClr.getAttribute("lastClr")) {
        return ensureARGB(sysClr.getAttribute("lastClr")!);
      }

      // Handle other color types like schemeClr if needed
      const schemeClr = element.getElementsByTagName("a:schemeClr")[0];
      if (schemeClr) {
        // Map scheme color to a default color - you might want to adjust these
        const val = schemeClr.getAttribute("val");
        switch (val) {
          case "lt1":
            return "FFFFFFFF"; // Light 1
          case "dk1":
            return "FF000000"; // Dark 1
          case "lt2":
            return "FFF2F2F2"; // Light 2
          case "dk2":
            return "FF1F1F1F"; // Dark 2
          default:
            return "FF000000";
        }
      }

      return "FF000000"; // Default to black
    };

    // Order matters! These tags represent the theme colors in order
    const colorTags = [
      "lt1", // Background 1
      "dk1", // Text 1
      "lt2", // Background 2
      "dk2", // Text 2
      "accent1", // Accent 1
      "accent2", // Accent 2
      "accent3", // Accent 3
      "accent4", // Accent 4
      "accent5", // Accent 5
      "accent6", // Accent 6
      "hlink", // Hyperlink
      "folHlink", // Followed Hyperlink
    ];

    for (const tag of colorTags) {
      const elements = colorScheme.getElementsByTagName(`a:${tag}`);
      if (elements.length > 0) {
        const color = getColorFromElement(
          elements.item(0) as unknown as Element
        );
        extractedColors.push(color);
      } else {
        // If the theme is missing a color, use the default
        extractedColors.push(themeColors[colorTags.indexOf(tag)] || "FF000000");
      }
    }

    return extractedColors;
  } catch (error) {
    console.warn("Error parsing theme XML:", error);
    return themeColors; // Fall back to default theme colors
  }
}
