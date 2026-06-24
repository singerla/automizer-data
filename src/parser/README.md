# Parser Types
Importing data with `automizer-data` is done by running a parser.
According to the structure of your input files, a parser subtype has to destructure tabular data and transform it into our intermediate JSON format.
A parser type will extend the base parser class and has to provide a method to harvest datasheets.
```ts
// Gesstabs extends Parser-Class
const parse = new Gesstabs(config)
// Harvest datasheets from xlsx file 
const datasheets = await parse.fromXlsx(filename)
// Store datasheets to prisma instance.
// Datasheets are based the intermediate JSON format.
const store = new Store(
  new PrismaClient()
)
const summary = await store.run(datasheets)
 ```
Please refer to [this example](https://github.com/singerla/automizer-data#example-usage) for parser options.

## Available parser modes
There are several parser subtypes, each tuned for a different data source. Pick the one that matches your input — or extend the shared `Parser` base for a brand new format.

| Parser | Entry method(s) | Input | Use it for |
| --- | --- | --- | --- |
| [`Gesstabs`](#gesstabs) | `fromXlsx(file)` | `.xlsx` | Crosstab exports from [GESStabs](https://gessgroup.de/software/gesstabs/) |
| [`Generic`](#generic) | `fromXlsx(file)`, `fromCustomXlsx(file)` | `.xlsx` | Simple, well-structured tables with a single header row, or a fully custom layout via callback |
| [`Tagged`](#tagged) | `fromXlsx(file)` | `.xlsx` | Tables that carry their tags inline, incl. Excel cell styles & conditional-formatting colors |
| [`Pspp`](#pspp) | `fromSav(file)` | `.sav` | SPSS/PSPP system files, parsed by driving the PSPP binary with generated syntax |
| [`MySQL`](#mysql) | `fromDatabase(connectionString)` | MySQL/MariaDB | Reading datasheets straight from a relational database |

## GESStabs
[GESStabs](https://gessgroup.de/software/gesstabs/) is a popular tool for statistical analysis in market research.
There is a lot of configuration available for GESStabs, but only a little is relevant for a proper import.

Please refer to [test-data.xlsx](https://github.com/singerla/automizer-data/blob/main/__test__/data/test-data.xlsx/) for an example.


Each row will be passed to and evaluated by `parseSections()`-method within Gesstabs-class.
This means, each row is analysed seperately and does not know much about the other rows before and afterwards.

At first, we detect the types of the first (column "A") and the second cell (column "B"). 
We need to know if a row has a first and/or a second cell, which is the key information to detect the *kind* of a row.

A resulting datasheet can have different sections:
- `info` is to store everything between `tabletitle` and column headers, as well as possible "vartitle" information which is given inside a table body.
- `header` will store information from column headers. There can be two or more header levels.
- `body` is the data itself, meaning all row labels and value cells.
- `meta` will accept additional information (e.g. base, mean values, significances) if keyed in `config.metaMap` 


Matching content is done row-by-row as follows:
- If first cell matches `config.separator`, a new dataTable is created and added to results.
- If both, first cell and second cell, are empty or whitespace-only, the row will be skipped.
- If first cell matches a record from `config.skipRows`, the row will be skipped.
- If the first cell is non-empty and there is no second cell, the contents of the first cell will be added to `info`
- If first and second cell is filled, and if first cell does not match a record from `config.metaMap`, the current row will be added to `body`.
- If first cell matches a record from `config.metaMap`, the row will be added to `meta`.

Unfortunately, it came to the blank character (" ") to be protagonist in content type detection, which makes it hard to find errors as you will have to be aware of "invisible" information within your output files.

### GESStabs configuration

- You should define a value for _null_ or empty results in a result row. 
This is done by GESStabs `zerodashchar` option. A blank should be set as default:

``zerodashchar = " ";``

- It is also important that the first subgroup column (commonly named "Total") is filled with non-empty cells "above", when there is more than a single level of header rows (e.g. B7-B8 in [test-data.xlsx](https://github.com/singerla/automizer-data/blob/main/__test__/data/test-data.xlsx/)).
This can be done by setting a blank as `title`:
```
groups k0 =
| "Total" : 1 EQ 1
;
title = " ";
```

- The given value for `tabletitle` should equal `separator` key from our parser's config.

``
tabletitle = "MyProjectTitle - ";
``

### Rendering tags
Finally, when all the data was parsed into raw results, we have to look at the values from `info` section for each table.
Gesstabs parser needs to be configured to use a callback function `renderTags()` which is applied to create proper tags from this stack.

The better our tagging fits to the data, the more comfortable browsing around will be.  

```ts
// The info array of each raw table will be passed to this
// callback. Tagging can be fine tuned here.
renderTags: (info: RawResultInfo[], tags: Tagger): void => {
  info.forEach((info, level) => {
    let cat
    
    if (info.key === 'body') {
      // Information exceptionally came from table body:
      // must be a vartitle:
      cat = 'vartitle'
    } else if (info.value.indexOf('- ') === 0) {
      // e.g. "- Filtered by Subgroup A -"
      cat = 'measure'
    } else if (level === 0) {
      // We strip the table separator and pass Country Name
      info.value = info.value.replace('Table Separator – ', '')
      cat = 'country'
    } else if (level === 1) {
      // The first info-line below table separator
      cat = 'variable'
    } else if (level === 2) {
      // Second line below table separator needs to contain
      // question's text
      cat = 'questionText'
    }
    
    if (cat) {
      tags.push(cat, info.value)
    }
    
    // non-matching element will be ignored.
  })
}
```

## Generic
The `Generic` parser is the lightweight option for tabular `.xlsx` files that are already reasonably well structured (e.g. a single header row followed by data rows). It reuses the same `info`/`header`/`body`/`meta` sectioning as GESStabs, but keeps configuration to a minimum.

```ts
const parse = new Generic(config)
const datasheets = await parse.fromXlsx(filename)
```

Key behaviour and options:
- `config.worksheetId` — the index of the worksheet to read (defaults to `0`).
- `config.separator` — string that marks a new table. If omitted, the parser auto-detects it from the very first cell (`A1`) of the sheet (`autoDetectConfig()`).
- `config.firstCell` — when a row's first cell equals this value, the row is treated as the column **header** instead of body.
- `config.skipRows` — rows whose first cell matches one of these labels are dropped.
- Header rows can also be detected implicitly: a row with an empty first cell but a filled second cell (while not yet inside the `body`) is stored as `header`.

### Fully custom layouts
If your file does not fit any sectioning logic at all, provide a `config.customXlsx` callback and call `fromCustomXlsx()`. The raw worksheet `data` and the file name are handed to your callback, which must return the parser's `results` structure directly:

```ts
const parse = new Generic(config) // config.customXlsx is your callback
const datasheets = await parse.fromCustomXlsx(filename)
```

> `Generic` also exposes a static helper `Generic.shuffleRow(row, r)` that adds a little randomness to imported values — handy for generating anonymized demo data.

## Tagged
The `Tagged` parser targets `.xlsx` files whose tables already carry their tagging information inline, so you do not need a `renderTags()` callback. It is built on [ExcelJS](https://github.com/exceljs/exceljs) (instead of `node-xlsx`), which lets it read far richer cell information.

```ts
const parse = new Tagged(config)
const datasheets = await parse.fromXlsx(filename)
```

Highlights:
- **Reads cell styling** — background, foreground and font colors are resolved through a workbook color converter and can be carried over into metadata.
- **Conditional formatting** — set `config.calculateConditionalStyle = true` to evaluate the worksheet's conditional-formatting rules and capture the resulting colors (e.g. for significance / heatmap cells).
- **Inline tagging** — categories and tags are read directly from dedicated columns/rows of the sheet, so the table describes itself.
- Iterates over **all worksheets** in the workbook, parsing each one in turn.

## Pspp
The `Pspp` parser reads SPSS/PSPP system files (`.sav`). Instead of parsing a spreadsheet, it generates PSPP syntax from your configuration, runs the local PSPP binary, and parses the CSV output it produces.

```ts
const parse = new Pspp(config)
const datasheets = await parse.fromSav(filename)
```

Everything is configured under `config.pspp`:
- `binary` — path to the `pspp` executable to invoke.
- `commands` — the crosstab/aggregation commands to run (each becomes a table).
- `filters` — subgroup filters applied to the data (e.g. by age, region…).
- `labels` — value/variable label overrides.
- `addTags` — additional tags attached to every resulting datasheet.
- `keys` — overrides for the localized output keys PSPP emits.
- `psppLanguage` — language of the PSPP output (defaults to `"en"`), used to pick the right set of result keys.

Under the hood the parser writes a temporary `.sps` syntax file, calls PSPP via `callPspp()`, then transforms the generated CSV into the intermediate JSON datasheets.

## MySQL
The `MySQL` parser pulls datasheets straight out of a MySQL/MariaDB database, which is useful when your statistics already live in a relational store.

```ts
const parse = new MySQL(config)
const datasheets = await parse.fromDatabase()
```

Configured under `config.mysql`:
- `connection` — the [`mysql2`](https://github.com/sidorares/node-mysql2) connection options used to open the database connection.
- `callback(connection, datasheets)` — your function that runs queries against the live `connection` and pushes the resulting `Datasheet` objects into the `datasheets` array.

This keeps full control over the SQL in your hands while reusing the same storage pipeline as every other parser.
