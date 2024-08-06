import { DataPoint, DataTag } from "./types/types";
import { InputKeys } from "./modelizer/modelizer-types";

export default class Keys {
  /**
   * Stores all row keys, column keys and tags before any modification is
   * applied. Useful to compare the original values and output.
   * @private
   */
  readonly #inputKeys: InputKeys = {
    row: [],
    column: [],
    nested: [],
    category: [],
    byCategoryId: (id: number) => {
      return (
        this.#inputKeys.category.find((inputKey) => inputKey.categoryId === id)
          ?.keys || []
      );
    },
    hasKey: (key: string, section) => {
      if (typeof section === "number") {
        return this.#inputKeys.byCategoryId(section).includes(key);
      }
      return this.#inputKeys[section].includes(key);
    },
  };

  addPoints(points: DataPoint[]) {
    points.forEach((point) => {
      this.#addPoint(point);
    });
  }

  /**
   * Retrieve all untouched unique row and column keys and tags from all
   * DataPoints. Object keys are 'row', 'col' and each used categoryId.
   * @returns InputKeys Object with section keys and array of strings values.
   */
  getInputKeys(): InputKeys {
    return this.#inputKeys;
  }

  setInputKeys(section: keyof Keys, keys: string[]): void {
    this.#inputKeys[section] = keys;
  }

  getCategoryKeys(categoryId: number): string[] {
    return this.#inputKeys.byCategoryId(categoryId);
  }

  updateCategoryKeys(categoryId: number, keys: string[]): void {
    const existing = this.#inputKeys.category.find(
      (inputKey) => inputKey.categoryId === categoryId
    );
    if (existing) {
      existing.keys = keys;
    } else {
      this.#inputKeys.category.push({
        categoryId,
        keys,
      });
    }
  }

  #addPoint(point: DataPoint) {
    if (!this.#inputKeys.row.includes(point.row)) {
      this.#inputKeys.row.push(point.row);
    }

    if (!this.#inputKeys.column.includes(point.column)) {
      this.#inputKeys.column.push(point.column);
    }

    point.tags.forEach((tag) => {
      this.#addInputCategoryKey(tag);
    });

    const isNestedParent = point.getMeta("isParent");
    if (isNestedParent && !this.#inputKeys.nested.includes(point.row)) {
      this.#inputKeys.nested.push(point.row);
    }
  }

  #addInputCategoryKey(tag: DataTag) {
    let categoryKeys = this.#inputKeys.category.find(
      (keys) => keys.categoryId === tag.categoryId
    );

    if (!categoryKeys) {
      this.#inputKeys.category.push({
        categoryId: tag.categoryId,
        keys: [tag.value],
      });
    } else if (!categoryKeys.keys.includes(tag.value)) {
      categoryKeys.keys.push(tag.value);
    }
  }
}
