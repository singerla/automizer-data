import { PrismaClient, Tag } from '@prisma/client';
import { ITagsCache } from '../types/types';

export default class TagsCache implements ITagsCache {
  prisma: PrismaClient;
  buffer: Tag[] = [];

  init = async (prisma: PrismaClient) => {
    this.setPrismaClient(prisma);
    this.buffer = await this.prisma.tag.findMany();
    console.log('TagsCache initalized with ' + this.buffer.length + ' tags');
  };
  setPrismaClient = (prisma: PrismaClient) => {
    this.prisma = prisma;
  };
  reset = async () => {
    this.buffer = await this.prisma.tag.findMany();
    console.log('TagsCache reset with ' + this.buffer.length + ' tags');
  };
  exists = (name: string, categoryId: number): boolean => {
    return !!this.get(name, categoryId);
  };
  tagExists = (tag: Tag): boolean => {
    return !!this.buffer.find((obj) => obj.id === tag.id);
  };
  getMany = async (categoryId?: number): Promise<Tag[]> => {
    if (this.buffer.length === 0) {
      await this.reset();
    }
    if (!categoryId) {
      return this.buffer;
    }
    return this.buffer.filter((obj) => obj.categoryId === categoryId);
  };
  get = (name: string, categoryId: number): Tag | null => {
    return this.buffer.find(
      (obj) => obj.name === name && obj.categoryId === categoryId,
    );
  };
  getByValue = (name: string): Tag[] => {
    return this.buffer.filter((obj) => obj.name === name);
  };
  getById = (id: number): Tag | null => {
    return this.buffer.find((obj) => obj.id === id);
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
    console.log('TagsCache created tag with id ' + newTag.id + '');
    this.set(newTag);
    return newTag;
  };
  set = (tag: Tag): void => {
    if (!this.tagExists(tag)) {
      this.buffer.push(tag);
    }
  };
}
