# automizer-data

**Parse, tag, store and reshape statistical tabular data — then feed it straight into your PowerPoint charts and tables.**

`automizer-data` is the data engine behind [pptx-automizer](https://github.com/singerla/pptx-automizer). It ingests the messy crosstab exports that come out of statistical software (CSV/XLSX), slices them into clean, tagged two-dimensional tables, stores them in a database, and lets you query and transform them into exactly the result table your slide needs — ready to be rendered as a chart or table.

## What problems does it solve?

- **Crosstab chaos.** Exports from tools like [GESStabs](https://gessgroup.de/software/gesstabs/) or PSPP are huge, repetitive and human-formatted. `automizer-data` parses them into structured, queryable datasets automatically.
- **"Where is that number?"** Every table is tagged with the categories that describe it (country, variable, subgroup, measure…), so you select data by *meaning* instead of by cell coordinates.
- **Reshaping by hand.** The built-in **`Modelizer`** grid engine lets you filter, rename, transpose, map tags, compute differences/sums and run custom callbacks to morph raw data points into the precise layout a chart expects.
- **Last-mile to PowerPoint.** The `Convert` helper turns a result grid directly into [pptx-automizer](https://github.com/singerla/pptx-automizer) chart and table objects — bar/line series, combo, scatter, bubble and full tables.

> This project is *work in progress*, but already powers real reporting pipelines. Storage and querying is done with [Prisma](https://github.com/prisma/prisma) ORM tools.

## ✨ Key features

- **Multiple parsers out of the box** — `Gesstabs`, `Pspp`, `MySQL`, `Generic` and a flexible `Tagged` parser, all built on a shared `Parser` base. Tagged mode even reads Excel cell styles and conditional-formatting colors.
- **Tag-based data model** — categories, tags, sheets, rows, columns, metadata and significance markers, stored and browsable via Prisma.
- **The `Modelizer` grid engine** — a cell/row/column model with caching (`toCache`/`fromCache`), key-based indexing, transpose, and a rich set of modifiers (filter, map, mapTags, rename, exclude, calcDifference, calcSum, moveTagsToMeta, custom callbacks).
- **External statistics querying** — a `DuckDB` connector to fetch aggregated crosstab results from a statistics API, with tag caching and multi-variable support.
- **Direct pptx-automizer output** — `Convert` emits `toSeriesCategories`, `toVerticalLines`, `toCombo`, `toScatter`, `toBubbles` and `toTable` chart/table data.
- **Caching & performance** — modelizer result caching and tags caching keep repeated queries fast.

The [example-xlsx](https://github.com/singerla/automizer-data/blob/main/__test__/data/test-data.xlsx) in the `__test__/data` folder is based on [GESStabs](https://gessgroup.de/software/gesstabs/).

## Installation
### As a package
If you are working on an existing project, you can add *automizer-data* to it using npm or yarn. Run
```
$ yarn add automizer-data
```
or
```
$ npm install automizer-data
```
in the root folder of your project. This will download and install the most recent version into your existing project.

### As a cloned repository
If you want to see how it works and you like to run own tests, you should clone this repository and install the dependencies:
```
$ git clone git@github.com:singerla/automizer-data.git my-project
$ cd my-project
$ yarn install
$ yarn prisma generate
```

## Prisma studio
You can open prisma studio and take a look at the data:
```
$ yarn prisma studio
```
A lot of good stuff can be found at [prisma.io](https://www.prisma.io/).

## Tests
The project ships with a [Jest](https://jestjs.io/) test suite that runs against an isolated, seeded SQLite database, so you can run it without touching your real data:
```
$ yarn test
```

# Import Data
According to parser's configuration, parsed data will sliced, tagged and separated into two-dimensional tables.

The Database contains:
- __Categories:__ Generic nouns to describe the basic structure of your project 
- __Tags:__ Values of a certain category
- __Sheets:__ Two-dimensional tables and their additional info

Each __Sheet__ will contain:
- a collection of rows
- a collection of columns
- the two-dimensional table body
- a collection of tags
- a collection of metadata that came along with the sheet

## Example usage
```ts
import { PrismaClient } from '@prisma/client'
import { Parser, Store } from '../src/index';
import { ParserOptions, Tagger, RawResultInfo } from "../src/types";

const store = new Store(
  new PrismaClient()
)

const config = <ParserOptions> {
  // This string separates tables if found in Column A
  separator: 'Table Separator',
  // A row that fits to any of the strings below will be
  // separated into "meta"-field if found in Col A
  metaMap: {
    base: ['BASE'],
    topBox: ['Top-2-Box (1-2)'],
    bottomBox: ['Bottom-2-Box (4-5)'],
    mean: ['Mean Value']
  },
  // Rows that equal to one of the labels below will be skipped.
  skipRows: [
    'company',
    '* Annotation',
    '(Sum of answers)'
  ],
  // A callback function to be applied to every body row
  renderRow: (row: string[]): (number|null)[] => {
    return row.map(cell => {
      if(cell === ' ') return null
      else return Number(cell)
    })
  },
  // The info array of each sub-table will be passed to this
  // callback. Tagging can be fine tuned here.
  renderTags: (info: RawResultInfo[], tags: Tagger): void => {
    info.forEach((info, level) => {
      let cat
      // info.key contains the info string's original section
      // could be 'body' or 'info'
      if(info.key === 'body') {
        cat = 'vartitle'
      } else if(info.value.indexOf('- ') === 0) {
        cat = 'measure'
      } else if(level === 0) {
        // We strip the table separator and pass CountryName
        info.value = info.value.replace('Table Separator – ', '')
        cat = 'country'
      } else if(level === 1) {
        cat = 'variable'
      } else if(level === 2) {
        cat = 'questionText'
      }
      if(cat) {
        tags.push(cat, info.value)
      }
    })
  },
}

const parse = new Gesstabs(config)
const file = `${__dirname}/data/test-data.xlsx`
const datasheets = await parse.fromXlsx(filename)
const summary = await store.run(datasheets)
```

> Besides `Gesstabs`, you can use the `Pspp`, `MySQL`, `Generic` or `Tagged` parsers in the same way — pick the one that matches your data source, or extend the shared `Parser` base for a new format.

# Intermediate JSON
Xlsx-Parser will tranform tabular data into an intermediate JSON object. The closer your input data comes to this format, the easier it will be to implement a new parser type. 
```json
{
  "tags": [
    {
      "category": "country",
      "value": "Norway"
    },
    {
      "category": "variable",
      "value": "Q12"
    },
    {
      "category": "category",
      "value": "Bar soap"
    },
    {
      "category": "subgroup",
      "value": "Age"
    },
    {
      "category": "measure",
      "value": "nominal"
    }
  ],
  "columns": ["Total", "19-29", "30-39", "40-69"],
  "rows": ["answer 1", "answer 2", "answer 3"],
  "data": [
    [29,18,36,12],
    [39,19,24,11],
    [19,28,46,10]
  ],
  "meta": {
    "significance": [
      [null,null,"h",null],
      [null,"h","l",null],
      [null,null,"h","l"]
    ]
  }
}
```

# Query Data
As all the Sheets are tagged, our queries will use tags to find the desired datasets.

```ts
import { getData, Store } from '../src';
import { all } from '../src/filter';
import { value } from '../src/cell';

// A selector is an array of tags.
const selector = [
    {
      category: 'country',
      value: 'Norway'
    },
    {
      category: "variable",
      value: "Q12"
    }
]

// The grid will define rows, cols and a callback
// to run inside a target cell.
const grid = {
    rows: all('row'),
    columns: all('column'),
    cell: value
}

const result = await getData(selector, grid)

// automizer-data will convert the result directly into
// a pptx-automizer-object.
const chartData = result.toSeriesCategories()
```

## Reshaping with Modelizer & Convert
Under the hood, every query result is backed by a `Modelizer` grid. You can transform it before handing it over to a chart, and `Convert` offers a range of output formats for [pptx-automizer](https://github.com/singerla/pptx-automizer):

- `toSeriesCategories()` — classic bar/line/pie series with categories
- `toVerticalLines()` — vertical line charts
- `toCombo()` — combined chart types
- `toScatter()` / `toBubbles()` — XY and bubble charts
- `toTable()` — full table data (row labels, column labels and body)

Modelizer also lets you `filter`, `rename`, `transpose`, `mapTags`, `moveTagsToMeta`, `calcDifference`, `calcSum` or apply custom callbacks, and can cache its state via `toCache()` / `fromCache()` for fast repeated rendering.

## External statistics API (DuckDB)
Instead of (or in addition to) the local Prisma store, `automizer-data` can fetch pre-aggregated crosstabs from an external statistics service through the `DuckDB` connector. It supports multi-variable queries, tag caching and a configurable API endpoint/token, making it easy to plug into a remote analytics backend.

