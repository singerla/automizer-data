import { PrismaClient, Prisma } from './client/index'

const prisma = new PrismaClient()

const userData: Prisma.UserCreateInput[] = [
  {
    name: 'Thomas Singer',
    email: 'thomas@singer-software.de',
  }
]

const categoryData: Prisma.CategoryCreateInput[] = [
  {
    name: 'country',
    color: 'primary',
    icon: 'flag'
  },
  {
    name: 'variable',
    color: 'secondary',
    icon: 'psychology'
  },
  {
    name: 'subgroup',
    color: 'dark',
    icon: 'donut_small'
  },
]

const tagData: Prisma.TagCreateInput[] = [
  {
    name: 'Norway',
    category: {
      connect: { id: 1 }
    }
  },
  {
    name: 'Q12',
    category: {
      connect: { id: 2 }
    }
  },
  {
    name: 'Q13',
    category: {
      connect: { id: 2 }
    }
  },
  {
    name: 'Age',
    category: {
      connect: { id: 3 }
    }
  },
  {
    name: 'Sweden',
    category: {
      connect: { id: 1 }
    }
  },
  {
    name: 'Gender',
    category: {
      connect: { id: 3 }
    }
  },
]

const importData: Prisma.ImportCreateInput[] = [
  {
    file: 'test-data.xlsx',
    user: {
      connect: { id: 1 }
    }
  },
]

const sheetData: Prisma.SheetCreateInput[] = [
  {
    import: {
      connect: { id:1 }
    },
    columns: "[\"Total\", \"19-29\", \"30-39\", \"40-69\"]",
    rows: "[\"answer 1\", \"answer 2\", \"answer 3\"]",
    data: "[[44,18,36,12],[39,19,24,11],[19,28,46,10]]",
    meta: "[]",
    tags: {
      connect: [
        { id: 1 }, { id: 2 }, { id: 4 },
      ]
    }
  },
  {
    import: {
      connect: { id:1 }
    },
    columns: "[\"Total\", \"19-29\", \"30-39\", \"40-69\"]",
    rows: "[\"answer 4\", \"answer 5\", \"answer 6\"]",
    data: "[[24,28,46,2],[19,39,54,1],[29,22,16,3]]",
    meta: "[]",
    tags: {
      connect: [
        { id: 1 }, { id: 3 }, { id: 4 },
      ]
    }
  },
  {
    import: {
      connect: { id:1 }
    },
    columns: "[\"Total\", \"19-29\", \"30-39\", \"40-69\"]",
    rows: "[\"answer 11\", \"answer 12\", \"answer 13\"]",
    data: "[[44,18,36,12],[39,19,24,11],[19,28,46,10]]",
    meta: "[]",
    tags: {
      connect: [
        { id: 5 }, { id: 2 }, { id: 4 },
      ]
    }
  },
  {
    import: {
      connect: { id:1 }
    },
    columns: "[\"Total\", \"19-29\", \"30-39\", \"40-69\"]",
    rows: "[\"answer 4\", \"answer 5\", \"answer 6\"]",
    data: "[[21,32,26,12],[15,36,51,10],[17,22,16,13]]",
    meta: "[]",
    tags: {
      connect: [
        { id: 5 }, { id: 3 }, { id: 4 },
      ]
    }
  },
  {
    import: {
      connect: { id:1 }
    },
    columns: "[\"Total\", \"male\", \"female\", \"diverse\"]",
    rows: "[\"answer 11\", \"answer 12\", \"answer 13\"]",
    data: "[[44,18,36,12],[39,19,24,11],[19,28,46,10]]",
    meta: "[]",
    tags: {
      connect: [
        { id: 5 }, { id: 2 }, { id: 6 },
      ]
    }
  },
  {
    import: {
      connect: { id:1 }
    },
    columns: "[\"Total\", \"male\", \"female\", \"diverse\"]",
    rows: "[\"answer 14\", \"answer 15\", \"answer 16\"]",
    data: "[[24,28,46,2],[19,39,54,1],[29,22,16,3]]",
    meta: "[]",
    tags: {
      connect: [
        { id: 5 }, { id: 3 }, { id: 6 },
      ]
    }
  },
]

const selectionData: Prisma.SelectionCreateInput[] = [
  {
    tags: {
      connect: [{ id: 1 },{ id: 2 },{ id: 4 }]
    },
  },
  {
    tags: {
      connect: [{ id: 1 },{ id: 3 },{ id: 4 }]
    },
  },
  {
    tags: {
      connect: [{ id: 2 }]
    },
  },
  {
    tags: {
      connect: [{ id: 3 }]
    },
  },
  {
    tags: {
      connect: [{ id: 1 }]
    },
  },
  {
    tags: {
      connect: [{ id: 5 }]
    },
  },
  {
    tags: {
      connect: [{ id: 1 }, { id: 5 }]
    },
  }
]

const dataObjectData: Prisma.DataObjectCreateInput[] = [
  {
    selections: {
      connect: [{id: 1}]
    },
    grid: {
      create: {
        rows: 'all',
        columns: 'all',
        cell: 'value'
      }
    },
  },
  {
    selections: {
      connect: [{id: 2}]
    },
    grid: {
      create: {
        rows: 'all',
        columns: 'all',
        cell: 'value'
      }
    },
  },
  {
    selections: {
      connect: [{id: 2}, {id: 4}]
    },
    grid: {
      create: {
        rows: 'all',
        columns: 'all',
        cell: 'value'
      }
    },
  }
]

async function main() {
  console.log(`Start seeding ...`)

  for (const u of userData) {
    const user = await prisma.user.create({
      data: u,
    })
    console.log(`Created user with id: ${user.id}`)
  }

  for (const i of importData) {
    const imports = await prisma.import.create({
      data: i,
    })
    console.log(`Created import with id: ${imports.id}`)
  }

  for (const c of categoryData) {
    const category = await prisma.category.create({
      data: c,
    })
    console.log(`Created category with id: ${category.id}`)
  }

  for (const t of tagData) {
    const tag = await prisma.tag.create({
      data: t,
    })
    console.log(`Created tag with id: ${tag.id}`)
  }

  for (const s of sheetData) {
    const sheet = await prisma.sheet.create({
      data: s,
    })
    console.log(`Created sheet with id: ${sheet.id}`)
  }

  for (const s of selectionData) {
    const selection = await prisma.selection.create({
      data: s,
    })
    console.log(`Created selection with id: ${selection.id}`)
  }

  for (const o of dataObjectData) {
    const object = await prisma.dataObject.create({
      data: o,
    })
    console.log(`Created dataObject with id: ${object.id}`)
  }
  console.log(`Seeding finished.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
