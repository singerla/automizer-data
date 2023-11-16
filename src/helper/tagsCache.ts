import { PrismaClient, Tag } from "@prisma/client";
import { ITagsCache } from "../types/types";

export default class TagsCache implements ITagsCache {
  prisma: PrismaClient;
  buffer: Tag[] = [];

  constructor() {}

  init = async (prisma: PrismaClient) => {
    this.prisma = prisma;
    this.buffer = await this.prisma.tag.findMany();
    console.log("TagsCache initalized with " + this.buffer.length + " tags");
  };
  exists = (name: string, categoryId: number): boolean => {
    return !!this.get(name, categoryId);
  };
  tagExists = (tag: Tag): boolean => {
    return !!this.buffer.find((obj) => obj.id === tag.id);
  };
  getMany = (categoryId?: number): Tag[] => {
    if (!categoryId) {
      return this.buffer;
    }
    return this.buffer.filter((obj) => obj.categoryId === categoryId);
  };
  get = (name: string, categoryId: number): Tag | null => {
    return this.buffer.find(
      (obj) => obj.name === name && obj.categoryId === categoryId
    );
  };
  create = async (name: string, categoryId: number): Promise<Tag> => {
    const newTag = await this.prisma.tag.create({
      data: {
        name: name,
        category: {
          connect: { id: categoryId },
        },
      },
    });
    console.log("TagsCache created tag with id " + newTag.id + "");
    this.set(newTag);
    return newTag;
  };
  set = (tag: Tag): void => {
    if (!this.tagExists(tag)) {
      this.buffer.push(tag);
    }
  };
}
