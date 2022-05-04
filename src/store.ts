import { Category, PrismaClient, Sheet, Tag } from "./client";
import Query from "./query";
import {
  Datasheet,
  DataTag,
  StatusTracker,
  StoreOptions,
  StoreSummary,
} from "./types";
import crypto from "crypto";

export class Store {
  prisma: PrismaClient;
  summary: StoreSummary;
  options: StoreOptions | undefined;
  query: Query;
  categories: Category[];
  tags: Tag[];
  importId: number;
  status: StatusTracker;

  constructor(prisma: PrismaClient, options?: StoreOptions) {
    this.prisma = prisma;
    this.summary = {
      ids: [],
      deleted: [],
    };

    this.query = new Query(this.prisma);
    this.options = {
      replaceExisting: true,
      filename: "unknown",
      userId: 1,
      statusTracker: (status: StatusTracker) => {
        console.log(status.share);
      },
    };

    if (options) {
      this.options = Object.assign(this.options, options);
    }

    this.importId = 0;
    this.categories = [];
    this.tags = [];
    this.status = {
      current: 0,
      max: 0,
      share: 0,
      info: undefined,
      increment: () => {
        this.status.current++;
        this.status.share = Math.round(
          (this.status.current / this.status.max) * 100
        );
        this.status.next(this.status);
      },
      next: this.options.statusTracker,
    };
  }

  async run(datasheets: Datasheet[]): Promise<StoreSummary> {
    if (this.options?.runBefore) {
      await this.options?.runBefore(this.prisma);
    }

    this.status.max = datasheets.length;
    this.status.info = "analyze datasheets";

    await this.getImport();
    await this.getCategories();
    await this.getTags();

    for (let i in datasheets) {
      this.status.info = "store datasheets";
      this.status.increment();
      await this.storeData(datasheets[i]);
    }

    // await this.prisma.$disconnect()

    return this.summary;
  }

  async getImport() {
    const newImport = await this.prisma.import.create({
      data: {
        file: this.options.filename,
        user: {
          connect: {
            id: this.options.userId,
          },
        },
      },
    });
    this.importId = newImport.id;
  }

  async getCategories(): Promise<void> {
    this.categories = await this.prisma.category.findMany();
  }

  async createCategory(name: string): Promise<Category> {
    const newCat = await this.prisma.category.create({
      data: {
        name: name,
        color: "grey",
        icon: "settings",
      },
    });
    this.categories.push(newCat);
    return newCat;
  }

  async getTags(): Promise<void> {
    this.tags = await this.prisma.tag.findMany();
  }

  async createTag(name: string, catId: number): Promise<Tag> {
    const newTag = await this.prisma.tag.create({
      data: {
        name: name,
        categoryId: catId,
      },
    });
    this.tags.push(newTag);
    return newTag;
  }

  async storeData(datasheet: Datasheet) {
    await this.addCategoryIdToTags(datasheet.tags);
    await this.addTagIdsToTags(datasheet.tags);

    if (this.options?.replaceExisting) {
      await this.deleteExistingDatasheets(datasheet);
    }

    await this.createSheet(datasheet);
  }

  async addCategoryIdToTags(tags: DataTag[]): Promise<void> {
    for (let i in tags) {
      const tag = tags[i];
      const cat = this.categories.find(
        (cat: Category) => cat.name === tag.category
      );
      if (cat && cat.id) {
        tag.categoryId = cat.id;
      } else {
        const newCat = await this.createCategory(tag.category);
        tag.categoryId = newCat.id;
      }
    }
  }

  async addTagIdsToTags(tags: DataTag[]): Promise<void> {
    for (let i in tags) {
      const tag = tags[i];
      const existingTag = this.tags.find(
        (existingTag: Tag) =>
          existingTag.name === tag.value &&
          existingTag.categoryId === tag.categoryId
      );

      if (!existingTag) {
        let newTag = await this.createTag(tag.value, <number>tag.categoryId);
        tag.id = newTag.id;
      } else {
        tag.id = existingTag.id;
      }
    }
  }

  async createSheet(datasheet: Datasheet): Promise<Sheet> {
    const tagIds = datasheet.tags.map((tag) => {
      return { id: tag.id };
    });
    const newSheet = await this.prisma.sheet.create({
      data: {
        columns: JSON.stringify(datasheet.columns),
        rows: JSON.stringify(datasheet.rows),
        data: JSON.stringify(datasheet.data),
        meta: JSON.stringify(datasheet.meta),
        tags: {
          connect: tagIds,
        },
        import: {
          connect: { id: this.importId },
        },
        ...this.getSheetKeys(datasheet),
      },
    });

    if (newSheet.id) {
      datasheet.id = newSheet.id;
      this.summary.ids.push(datasheet.id);
    } else {
      console.error(datasheet);
      throw "Could not store datasheet.";
    }

    return newSheet;
  }

  getSheetKeys(datasheet: Datasheet) {
    return {
      rowKey: this.createHash(datasheet.rows),
      columnKey: this.createHash(datasheet.columns),
      tagKey: this.createHash(datasheet.tags.map((tag: any) => tag.id)),
    };
  }

  createHash(arr: string[]): string {
    const str = arr.join("|");
    const sha256Hasher = crypto.createHmac("sha256", "123");
    const hash = sha256Hasher.update(str).digest("hex");
    return hash;
  }

  async deleteExistingDatasheets(datasheet: Datasheet) {
    const keys = this.getSheetKeys(datasheet);
    const ids = await this.prisma.sheet.deleteMany({
      where: {
        tagKey: keys.tagKey,
      },
    });
    this.summary.deleted.push(ids.count);
  }
}
