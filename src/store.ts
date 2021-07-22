import { PrismaClient, Sheet } from '@prisma/client'
import { Query } from './query'
import { Datasheet, DataTag, StoreOptions, StoreSummary } from './types'

export class Store {
  prisma: PrismaClient
  summary: StoreSummary
  options: StoreOptions | undefined
  query: Query

  constructor(prisma: PrismaClient, options?: StoreOptions) {
    this.prisma = prisma
    this.summary = {
      ids: [],
      deleted: 0
    }

    this.query = new Query(this.prisma)
    this.options = {
      replace: true
    }

    if(options) {
      this.options = Object.assign(options, this.options)
    }
  }

  async run(datasheets: Datasheet[]): Promise<StoreSummary> {
    for(let i in datasheets) {
      await this.storeData(datasheets[i])
    }

    return this.summary
  }

  async storeData(datasheet: Datasheet) {
    for(let i in datasheet.tags) {
      let cat = await this.prisma.category.findFirst({
        where: {
          name: datasheet.tags[i].category,
        }
      })

      if(cat && cat.id) {
        datasheet.tags[i].categoryId = cat.id
      } else {
        let newCat = await this.prisma.category.create({
          data: {
            name: datasheet.tags[i].category,
          }
        })
        datasheet.tags[i].categoryId = newCat.id
      }
    }

    for(let i in datasheet.tags) {
      let tag = await this.prisma.tag.findFirst({
        where: {
          categoryId: datasheet.tags[i].categoryId,
          name: datasheet.tags[i].value
        },
      })

      if(!tag) {
        let newTag = await this.prisma.tag.create({
          data: {
            name: datasheet.tags[i].value,
            categoryId: <number> datasheet.tags[i].categoryId,
          }
        })
        datasheet.tags[i].id = newTag.id
      } else {
        datasheet.tags[i].id = tag.id
      }
    }

    if(this.options?.replace) {
      await this.deleteExistingDatasheets(datasheet.tags)
    }

    await this.createSheet(datasheet)
  }

  async createSheet(datasheet: Datasheet): Promise<Sheet> {
    const newSheet = await this.prisma.sheet.create({
      data: {
        columns: JSON.stringify(datasheet.columns),
        rows: JSON.stringify(datasheet.rows),
        data: JSON.stringify(datasheet.data),
        meta: JSON.stringify(datasheet.meta),
        tags: {
          connect: datasheet.tags.map(tag => {
            return { id: tag.id }
          })
        }
      }
    })

    if(newSheet.id) {
      datasheet.id = newSheet.id
      this.summary.ids.push(datasheet.id)
    } else {
      console.error(datasheet)
      throw new Error('Could not store datasheet.')
    }

    return newSheet
  }

  async deleteExistingDatasheets(tags: DataTag[]) {
    const existingSheets = await this.query.getSheets(tags)
    if(existingSheets.length) {
      const ids = existingSheets.map(sheet => sheet.id)
      const deleted = await this.prisma.sheet.deleteMany({
        where: {
          id: {
            in: ids
          }
        }
      })
      this.summary.deleted += Number(deleted)
    }
  }
}
