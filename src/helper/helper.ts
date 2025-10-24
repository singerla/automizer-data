import { Datasheet } from "../types/types";
import crypto from "crypto";

export default class Helper {
  constructor() {}

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
