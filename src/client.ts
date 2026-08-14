import type { PrismaClient as PrismaClientCtor, Prisma, Category, Sheet, Tag } from '@prisma/client'

export type { Prisma, Category, Sheet, Tag }
export type PrismaClient = InstanceType<typeof PrismaClientCtor>

// `@prisma/client`'s generated output only exists where this package's own
// schema was generated against (its dev/test SQLite db). Consumers that embed
// automizer-data as a dependency never get that generated output in their own
// install tree, and in practice always inject their own PrismaClient instance
// instead of constructing this one. So requiring '@prisma/client' here must
// stay lazy - the very first line of this module used to run it eagerly,
// which crashes on `require('automizer-data')` in any host that doesn't have
// a matching '@prisma/client' major installed at its own package root.
export const PrismaClient: new (
  ...args: ConstructorParameters<typeof PrismaClientCtor>
) => PrismaClient = new Proxy(function () {} as any, {
  construct(_target, args) {
    const { PrismaClient: RealPrismaClient } = require('@prisma/client')
    return new RealPrismaClient(...args)
  },
})
