import {Category, PrismaClient, Sheet, Tag } from '@prisma/client'
import { Query } from './query'
import { Datasheet, DataTag, StoreOptions, StoreSummary } from './types'

export class Store {
  prisma: PrismaClient
  summary: StoreSummary
  options: StoreOptions | undefined
  query: Query
  categories: Category[]
  tags: Tag[]
  importId: number

  constructor(prisma: PrismaClient, options?: StoreOptions) {
    this.prisma = prisma
    this.summary = {
      ids: [],
      deleted: []
    }

    this.query = new Query(this.prisma)
    this.options = {
      replaceExisting: true
    }

    if(options) {
      this.options = Object.assign(this.options, options)
    }

    this.importId = 0
    this.categories = []
    this.tags = []
  }

  async run(datasheets: Datasheet[]): Promise<StoreSummary> {
    if(this.options?.runBefore) {
      await this.options?.runBefore(this.prisma)
    }

    await this.getImport()
    await this.getCategories()
    await this.getTags()

    for(let i in datasheets) {
      await this.storeData(datasheets[i])
    }

    await this.prisma.$disconnect()

    return this.summary
  }

  async getImport() {
    if(this.prisma.import) {
      const newImport = await this.prisma.import.create({
        data: {
          file: 'Test',
          user: {
            connect: { id: 1}
          }
        }
      })
      this.importId = newImport.id
    }
  }

  async getCategories(): Promise<void> {
    this.categories = await this.prisma.category.findMany()
  }

  async createCategory(name: string): Promise<Category> {
    const newCat = await this.prisma.category.create({
      data: {
        name: name,
      }
    })
    this.categories.push(newCat)
    return newCat
  }

  async getTags(): Promise<void> {
    this.tags = await this.prisma.tag.findMany()
  }

  async createTag(name: string, catId: number): Promise<Tag> {
    const newTag = await this.prisma.tag.create({
      data: {
        name: name,
        categoryId: catId,
      }
    })
    this.tags.push(newTag)
    return newTag
  }

  async storeData(datasheet: Datasheet) {
    await this.addCategoryIdToTags(datasheet.tags)
    await this.addTagIdsToTags(datasheet.tags)

    if(this.options?.replaceExisting) {
      await this.deleteExistingDatasheets(datasheet.tags)
    }

    await this.createSheet(datasheet)
  }

  async addCategoryIdToTags(tags: DataTag[]): Promise<void> {
    for(let i in tags) {
      const tag = tags[i]
      const cat = this.categories.find((cat: Category) => cat.name === tag.category)

      if(cat && cat.id) {
        tag.categoryId = cat.id
      } else {
        const newCat = await this.createCategory(tag.category)
        tag.categoryId = newCat.id
      }
    }
  }

  async addTagIdsToTags(tags: DataTag[]): Promise<void> {
    for(let i in tags) {
      const tag = tags[i]
      const existingTag = this.tags.find((existingTag: Tag) =>
        existingTag.name === tag.value
        && existingTag.categoryId === tag.categoryId
      )

      if(!existingTag) {
        let newTag = await this.createTag(tag.value, <number> tag.categoryId)
        tag.id = newTag.id
      } else {
        tag.id = existingTag.id
      }
    }
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
        },
        import: {
          connect: { id: this.importId }
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
      await this.prisma.sheet.deleteMany({
        where: {
          id: {
            in: ids
          }
        }
      })
      this.summary.deleted.push(...ids)
    }
  }
}
