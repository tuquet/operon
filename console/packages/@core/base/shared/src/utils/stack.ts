/**
 * Stack data structure
 */
export class Stack<T> {
  /**
   * Stack size
   */
  get size() {
    return this.items.length;
  }
  /**
   * Whether deduplication is enabled
   */
  private readonly dedup: boolean;
  /**
   * Stack items
   */
  private items: T[] = [];

  /**
   * Maximum stack capacity
   */
  private readonly maxSize?: number;

  constructor(dedup = true, maxSize?: number) {
    this.maxSize = maxSize;
    this.dedup = dedup;
  }

  /**
   * Clear all items from stack
   */
  clear() {
    this.items.length = 0;
  }

  /**
   * Peek top item of stack
   * @returns Top item
   */
  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  /**
   * Pop top item from stack
   * @returns Top item
   */
  pop(): T | undefined {
    return this.items.pop();
  }

  /**
   * Push items onto stack
   * @param items Items to push
   */
  push(...items: T[]) {
    items.forEach((item) => {
      // Deduplicate
      if (this.dedup) {
        const index = this.items.indexOf(item);
        if (index !== -1) {
          this.items.splice(index, 1);
        }
      }
      this.items.push(item);
      if (this.maxSize && this.items.length > this.maxSize) {
        this.items.splice(0, this.items.length - this.maxSize);
      }
    });
  }
  /**
   * Remove items from stack
   * @param itemList Items to remove
   */
  remove(...itemList: T[]) {
    this.items = this.items.filter((i) => !itemList.includes(i));
  }
  /**
   * Retain items in stack
   * @param itemList Items to retain
   */
  retain(itemList: T[]) {
    this.items = this.items.filter((i) => itemList.includes(i));
  }

  /**
   * Convert stack items to array
   * @returns Array of stack items
   */
  toArray(): T[] {
    return [...this.items];
  }
}

/**
 * Create a Stack instance
 * @param dedup Whether to deduplicate
 * @param maxSize Max capacity
 * @returns Stack instance
 */
export const createStack = <T>(dedup = true, maxSize?: number) =>
  new Stack<T>(dedup, maxSize);
