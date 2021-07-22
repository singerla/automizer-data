
import { PrismaClient } from '@prisma/client'
import { Store } from './src/store'

const data = require('./data/test-data.json')

const store = new Store(
  new PrismaClient()
)

store.run(data)
  .then(response => {
    console.log(response)
  })
  .catch(e => {
    throw e
  })
  .finally(async () => {
    await store.prisma.$disconnect()
  })
