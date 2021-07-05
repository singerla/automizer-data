
import { PrismaClient } from '@prisma/client'
import { Import } from './src/import'

const data = require('./test-data.json')

const importData = new Import(
  new PrismaClient()
)

importData.run(data)
  .then(response => {
    console.log(response)
  })
  .catch(e => {
    throw e
  })
  .finally(async () => {
    await importData.prisma.$disconnect()
  })
