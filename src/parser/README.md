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

At the moment, GESStabs is the only parser type available.  

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
- If first cell is empty or whitespace-only, the row will be skipped.
- If first cell matches a record from `config.skipRows`, the row will be skipped.
- If the first cell is non-empty and there is no second cell, the contents of the first cell will be added to `info`
- If first an second cell are filled, and first cell does not match a record from `config.metaMap`, the current row will be added to `body`.
- If first cell matches a record from `config.metaMap`, the row will be added to `meta`.

### GESStabs configuration

Unfortunately, it came to the blank character (" ") to be protagonist in content type detection, which makes it hard to find errors as you will have to be aware of "invisible" information within your output files.

- You should define a value for _null_ or empty results in a result row. 
This is done by GESStabs `zerodashchar` option. A blank should be set as default:

``zerodashchar = " ";``

- It is also important that the first subgroup column (mostly named "Total") is filled with non-empty cells "above", when there is more than a single level of header rows (e.g. B7-B8 in [test-data.xlsx](https://github.com/singerla/automizer-data/blob/main/__test__/data/test-data.xlsx/)).
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
