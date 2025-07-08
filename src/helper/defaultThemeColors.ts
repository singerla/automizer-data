// Thanks to https://github.com/ClosedXML/ClosedXML/wiki/Excel-Indexed-Colors
export const indexedColorsNew = [
  "FF000000", // 0	Black
  "FFFFFFFF", // 1	White
  "FFFF0000", // 2	Red
  "FF00FF00", // 3	Bright Green
  "FF0000FF", // 4	Blue
  "FFFFFF00", // 5	Yellow
  "FFFF00FF", // 6	Pink
  "FF00FFFF", // 7	Turquoise
  "FF000000", // 8	Black
  "FFFFFFFF", // 9	White
  "FFFF0000", // 10	Red
  "FF00FF00", // 11	Bright Green
  "FF0000FF", // 12	Blue
  "FFFFFF00", // 13	Yellow
  "FFFF00FF", // 14	Pink
  "FF00FFFF", // 15	Turquoise
  "FF800000", // 16	Dark Red
  "FF008000", // 17	Green
  "FF000080", // 18	Dark Blue
  "FF808000", // 19	Dark Yellow
  "FF800080", // 20	Violet
  "FF008080", // 21	Teal
  "FFC0C0C0", // 22	Gray-25%
  "FF808080", // 23	Gray-50%
  "FF9999FF", // 24	Periwinkle
  "FF993366", // 25	Plum
  "FFFFFFCC", // 26	Ivory
  "FFCCFFFF", // 27	Light Turquoise
  "FF660066", // 28	Dark Purple
  "FFFF8080", // 29	Coral
  "FF0066CC", // 30	Ocean Blue
  "FFCCCCFF", // 31	Ice Blue
  "FF000080", // 32	Dark Blue
  "FFFF00FF", // 33	Pink
  "FFFFFF00", // 34	Yellow
  "FF00FFFF", // 35	Turquoise
  "FF800080", // 36	Violet
  "FF800000", // 37	Dark Red
  "FF008080", // 38	Teal
  "FF0000FF", // 39	Blue
  "FF00CCFF", // 40	Sky Blue
  "FFCCFFFF", // 41	Light Turquoise
  "FFCCFFCC", // 42	Light Green
  "FFFFFF99", // 43	Light Yellow
  "FF99CCFF", // 44	Pale Blue
  "FFFF99CC", // 45	Rose
  "FFCC99FF", // 46	Lavender
  "FFFFCC99", // 47	Tan
  "FF3366FF", // 48	Light Blue
  "FF33CCCC", // 49	Aqua
  "FF99CC00", // 50	Lime
  "FFFFCC00", // 51	Gold
  "FFFF9900", // 52	Light Orange
  "FFFF6600", // 53	Orange
  "FF666699", // 54	Blue-Gray
  "FF969696", // 55	Gray-Gray40%
  "FF003366", // 56	Dark Teal
  "FF339966", // 57	Sea Green
  "FF003300", // 58	Dark Green
  "FF333300", // 59	Olive Green
  "FF993300", // 60	Brown
  "FF993366", // 61	Plum
  "FF333399", // 62	Indigo
  "FF333333", // 63	Gray-80%
];

export const indexedColorsOld = [
  "FF000000", // 0 Black
  "FFFFFFFF", // 1 White
  "FFFF0000", // 2 Red
  "FF00FF00", // 3 Green
  "FF0000FF", // 4 Blue
  "FFFFFF00", // 5 Yellow
  "FFFF00FF", // 6 Magenta
  "FF00FFFF", // 7 Cyan
  "FF000000", // 8 Black
  "FFFFFFFF", // 9 White
  "FFFF0000", // 10 Red
  "FF00FF00", // 11 Green
  "FF0000FF", // 12 Blue
  "FFFFFF00", // 13 Yellow
  "FFFF00FF", // 14 Magenta
  "FF00FFFF", // 15 Cyan
  "FF800000", // 16 Dark Red
  "FF008000", // 17 Dark Green
  "FF000080", // 18 Dark Blue
  "FF808000", // 19 Dark Yellow
  "FF800080", // 20 Dark Magenta
  "FF008080", // 21 Dark Cyan
  "FFC0C0C0", // 22 Light Gray
  "FF808080", // 23 Gray
  "FF9999FF", // 24 Light Blue
  "FF993366", // 25 Light Pink
  "FFFFCC99", // 26 Light Yellow
  "FF99CC00", // 27 Light Green
  "FFFF99CC", // 28 Light Red
  "FFCC99FF", // 29 Light Purple
  "FFFF99FF", // 30 Pink
  "FF99CCFF", // 31 Light Blue
  "FFCC99FF", // 32 Purple
  "FFFFCC99", // 33 Light Orange
  "FF99CC00", // 34 Light Green
  "FF99CCFF", // 35 Light Blue
  "FFFF99CC", // 36 Light Red
  "FFCC99FF", // 37 Light Purple
  "FFFFCC99", // 38 Light Orange
  "FF99CC00", // 39 Light Green
  "FF99CCFF", // 40 Light Blue
  "FFFF99CC", // 41 Light Red
  "FFCC99FF", // 42 Light Purple
  "FFFFCC99", // 43 Light Orange
  "FF99CC00", // 44 Light Green
  "FF99CCFF", // 45 Light Blue
  "FFFF99CC", // 46 Light Red
  "FFCC99FF", // 47 Light Purple
  "FFFFCC99", // 48 Light Orange
  "FF99CC00", // 49 Light Green
  "FF99CCFF", // 50 Light Blue
  "FFFF99CC", // 51 Light Red
  "FFCC99FF", // 52 Light Purple
  "FFFFCC99", // 53 Light Orange
  "FF99CC00", // 54 Light Green
  "FF99CCFF", // 55 Light Blue
  "FFFF99CC", // 56 Light Red
  "FFCC99FF", // 57 Light Purple
  "FFFFCC99", // 58 Light Orange
  "FF99CC00", // 59 Light Green
  "FF99CCFF", // 60 Light Blue
  "FF000000", // 61 Black
  "FF000000", // 62 Black
  "FF000000", // 63 Black
];

export const indexedColors = {
  old: indexedColorsOld,
  new: indexedColorsNew,
};

// Theme colors (default Office theme)
export const themeColors = [
  "FFFFFFFF", // 0  Background
  "FF000000", // 1  Text
  "FFEEECE1", // 2  Background 2
  "FF1F497D", // 3  Text 2
  "FF4F81BD", // 4  Accent 1
  "FFC0504D", // 5  Accent 2
  "FF9BBB59", // 6  Accent 3
  "FF8064A2", // 7  Accent 4
  "FF4BACC6", // 8  Accent 5
  "FFF79646", // 9  Accent 6
  // ... add more theme colors as needed
];
