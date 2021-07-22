import { PrismaClient } from '@prisma/client'
import { Datasheet } from './types'

export class Store {
  prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async run(datasheets: Datasheet[]) {
    for(let i in datasheets) {
      await this.readData(datasheets[i])
    }
  }

  async readData(datasheet: Datasheet) {
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

    let newSheet = await this.prisma.sheet.create({
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

    datasheet.id = newSheet.id
    console.log(datasheet)
  }
}
