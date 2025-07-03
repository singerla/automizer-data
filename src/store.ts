import { Category, Prisma, PrismaClient, Tag } from "./client";

import Query from "./query";
import {
  Datasheet,
  DataTag,
  StatusTracker,
  StoreOptions,
  StoreSummary,
} from "./types/types";
import crypto from "crypto";
import TagsCache from "./helper/tagsCache";

type CreateSheetData = Prisma.SheetCreateArgs["data"] & {
  tags: {
    connect: CreateSheetTagsConnect;
  };
};
type CreateSheetTagsConnect = Prisma.Enumerable<Prisma.TagWhereUniqueInput>;

export class Store {
  prisma: PrismaClient;
  summary: StoreSummary;
  options: StoreOptions | undefined;
  query: Query;
  categories: Category[];
  sheetKeys: Record<string, number>;
  tags: Tag[];
  importId: number;
  status: StatusTracker;
  tagValueMaxLength: number;

  constructor(prisma: PrismaClient, options?: StoreOptions) {
    this.prisma = prisma;
    this.summary = {
      ids: [],
      deleted: [],
    };

    this.query = new Query(this.prisma);
    this.options = {
      dedupTagCategories: false,
      noDedupTagCategories: [],
      replaceExisting: true,
      filename: "unknown",
      userId: 1,
      statusTracker: (status: StatusTracker) => {
        console.log(status.share);
      },
      tagsCache: new TagsCache(),
    };

    if (options) {
      this.options = Object.assign(this.options, options);
    }

    this.importId = 0;
    this.tagValueMaxLength = 256;
    this.categories = [];
    this.sheetKeys = {};

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
    await this.runBefore();

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

  async runBefore() {
    if (this.options?.dropAllSheets === true) {
      const deleted = await this.prisma.sheet.deleteMany();
      console.log("Deleted " + String(deleted.count) + " sheets");
    }

    if (this.options?.dropAllTags === true) {
      const deletedTags = await this.prisma.tag.deleteMany();
      await this.options.tagsCache.init(this.prisma);
      console.log("Deleted " + String(deletedTags.count) + " tags");
    }
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
    const newCat = await this.prisma.category
      .create({
        data: {
          name: name,
          color: "grey",
          icon: "settings",
        },
      })
      .catch((e) => {
        throw "Cannot create category: " + name;
      });
    this.categories.push(newCat);
    return newCat;
  }

  async getTags(): Promise<void> {
    await this.options.tagsCache.init(this.prisma);
    // this.tags = await this.prisma.tag.findMany();
  }

  async createTag(name: string, catId: number): Promise<Tag> {
    const exists = this.options.tagsCache.get(name, catId);
    if (exists) {
      return exists;
    }
    return this.options.tagsCache.create(name, catId);
    // const newTag = await this.prisma.tag.create({
    //   data: {
    //     name: name,
    //     category: {
    //       connect: { id: catId },
    //     },
    //   },
    // });
    // this.tags.push(newTag);
    // return newTag;
  }

  async storeData(datasheet: Datasheet) {
    await this.addCategoryIdToTags(datasheet.tags);
    await this.addTagIdsToTags(datasheet.tags);

    const sheetData = this.createSheetData(datasheet);
    await this.dedupTagKeys(sheetData);

    if (this.options?.replaceExisting) {
      await this.deleteExistingDatasheets(sheetData);
    }

    await this.createSheet(datasheet, sheetData);
  }

  createSheetData(datasheet: Datasheet): CreateSheetData {
    const tagIds = datasheet.tags.map((tag) => {
      return { id: tag.id };
    });
    const tagInfo = datasheet.tags.map((tag) => tag.id);

    const { rowKey, columnKey, tagKey, sheetKey } =
      this.getSheetKeys(datasheet);

    return <CreateSheetData>{
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
      rowKey,
      columnKey,
      tagKey,
      tagInfo: JSON.stringify(tagInfo),
    };
  }

  async deleteExistingDatasheets(createSheetData: CreateSheetData) {
    const ids = await this.prisma.sheet.deleteMany({
      where: {
        tagKey: createSheetData.tagKey,
      },
    });
    this.summary.deleted.push(ids.count);
  }

  async createSheet(datasheet: Datasheet, createSheetData: CreateSheetData) {
    const newSheet = await this.prisma.sheet.create({
      data: createSheetData,
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

  async dedupTagKeys(sheetData: CreateSheetData) {
    const tagKey = sheetData.tagKey;
    if (!this.sheetKeys[tagKey]) {
      this.sheetKeys[tagKey] = 1;
    } else {
      this.sheetKeys[tagKey] += 1;
      const addCounterTags = <DataTag[]>[
        {
          category: "iSheetKey",
          value: "Sheet " + String(this.sheetKeys[tagKey]),
        },
      ];
      await this.addCategoryIdToTags(addCounterTags);
      await this.addTagIdsToTags(addCounterTags);

      const connectTags = [
        ...Object.values(sheetData.tags.connect),
        { id: addCounterTags[0].id },
      ] as CreateSheetTagsConnect;

      sheetData.tags.connect = connectTags;
      sheetData.tagKey = this.getTagKey(sheetData.tags.connect);

      // console.log("Duplicate sheet key: ");
      // console.log(sheetData);
    }
  }

  async addCategoryIdToTags(tags: DataTag[]): Promise<void> {
    for (let i in tags) {
      const tag = tags[i];
      const cat = this.categories.find(
        (cat: Category) => cat.name.toLowerCase() === tag.category.toLowerCase()
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
    for (const tag of tags) {
      if (tag.value.length > this.tagValueMaxLength) {
        console.error("Tag name shortened: " + tag.value);
        tag.value = tag.value.slice(256);
      }

      if (
        this.options.dedupTagCategories &&
        !this.options.noDedupTagCategories.includes(tag.categoryId)
      ) {
        this.dedupTagCategory(tag);
      }

      const existingTag = this.options.tagsCache.get(tag.value, tag.categoryId);

      if (!existingTag) {
        if (!tag.value) {
          console.log(tag);
          throw "Can't add tag!";
        }
        let newTag = await this.createTag(tag.value, <number>tag.categoryId);
        tag.id = newTag.id;
      } else {
        tag.id = existingTag.id;
      }
    }
  }

  dedupTagCategory(tag: DataTag) {
    const existingTagValues = this.options.tagsCache.getByValue(tag.value);
    if (existingTagValues.length) {
      const existing = existingTagValues.find(
        (existingTagValue) => existingTagValue.categoryId !== tag.categoryId
      );

      if (existing) {
        const existingCatInfo = this.categories.find(
          (cat) => existing.categoryId === cat.id
        );
        console.log(
          `Merged tag "${tag.value}" (${tag.category}/${tag.categoryId}) ` +
            `with category ${existingCatInfo.name}/${existingCatInfo.id}`
        );
        tag.categoryId = existing.categoryId;
      }
    }
  }

  getSheetKeys(datasheet: Datasheet) {
    const keys = {
      rowKey: this.createHashFromArray(datasheet.rows),
      columnKey: this.createHashFromArray(datasheet.columns),
      tagKey: this.getTagKey(datasheet.tags),
      sheetKey: null,
    };
    keys.sheetKey = this.createHashFromObject(keys);
    return keys;
  }

  getTagKey(tags): string {
    return this.createHashFromArray(tags.map((tag: any) => tag.id));
  }

  createHashFromObject(obj: Object): string {
    const str = JSON.stringify(obj);
    return this.createHash(str);
  }

  createHashFromArray(arr: string[]): string {
    const str = arr.join("|");
    return this.createHash(str);
  }

  createHash(str: string): string {
    const sha256Hasher = crypto.createHmac("sha256", "123");
    const hash = sha256Hasher.update(str).digest("hex");
    return hash;
  }
}
