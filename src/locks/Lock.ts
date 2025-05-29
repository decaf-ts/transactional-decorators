import { LockCallable } from "../types";

export class Lock {
  private queue: LockCallable[] = [];
  private locked = false;

  /**
   * @summary executes when lock is available
   * @param {Function} func
   */
  async execute(func: () => any) {
    await this.acquire();
    let result: any;
    try {
      result = await Promise.resolve(func());
    } catch (e: any) {
      this.release();
      throw e;
    }
    this.release();
    return result;
  }

  /**
   * @summary waits to acquire the lock
   * @param {string} [issuer]
   */
  async acquire(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    if (self.locked) {
      return new Promise<void>((resolve) => self.queue.push(resolve));
    } else {
      self.locked = true;
      return Promise.resolve();
    }
  }

  /**
   * @summary releases the lock
   */
  release() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const next: LockCallable | undefined = self.queue.shift();
    if (next) {
      if (
        typeof (globalThis as unknown as { window: any }).window === "undefined"
      )
        globalThis.process.nextTick(next); // if you are on node
      else setTimeout(next, 0); // if you are in the browser
    } else {
      self.locked = false;
    }
  }
}
