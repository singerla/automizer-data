# Basics
This package is able to parse structured tabular data from CSV or XLSX.
Stored data can be browsed and transformed into a desired two-dimensional result table.

Its primary purpose is to deliver data for [pptx-automizer](https://github.com/singerla/pptx-automizer).
This project is *Work in progress*.
Nevertheless, you might already use `automizer-data` to handle table files coming from statistical analytics software.
The [example-xlsx](https://github.com/singerla/automizer-data/blob/main/__test__/data/test-data.xlsx) in `__test__/data`-folder is based on [GESStabs](https://gessgroup.de/software/gesstabs/).

Storage and querying is done with [Prisma](https://github.com/prisma/prisma) ORM tools.

## Installation
If you want to see how it works and you like to run own tests, you should clone this repository and install the dependencies:
```
$ git clone git@github.com:singerla/automizer-data.git
$ cd pptx-automizer
$ yarn install
$ yarn prisma generate
```

## Prisma studio
You can open prisma studio and take a look at the data:
```
$ yarn prisma studio
```
A lot of good stuff can be found at [prisma.io](https://www.prisma.io/).

# Import Data
According to parser's configuration, parsed data will sliced, tagged and separated into two-dimensional tables.

The Database contains:
- __Categories:__ Generic nouns to describe the basic contents of your project 
- __Tags:__ Values of a certain category
- __Sheets:__ Two-dimensional tables and their additional info

Each __Sheet__ will contain:
- a collection of rows
- a collection of columns
- the two-dimenstional table body
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

const file = `${__dirname}/data/test-data.xlsx`
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

const parser = new Parser(config)
const summary = await parser.storeXlsxFile(file, store)
```
# Query Data
As all the Sheets are tagged, our queries will use tags as well to find the desired datasets.

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

// automizer-data will convert the data directly into
// a pptx-automizer-object. 
const chartData = result.toSeriesCategories()
```

