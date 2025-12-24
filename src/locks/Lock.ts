import { LockCallable } from "../types";

/**
 * @description Base lock implementation for concurrency control
 * @summary Provides a basic lock mechanism for controlling access to shared resources, with support for queuing and executing functions when the lock is available
 * @class Lock
 * @example
 * // Using the Lock class to execute a function with exclusive access
 * const lock = new Lock();
 * const result = await lock.execute(async () => {
 *   // This code will run with exclusive access
 *   return await performCriticalOperation();
 * });
 */
export class Lock {
  protected queue: LockCallable[] = [];
  protected locked = false;

  /**
   * @description Executes a function with exclusive lock access
   * @summary Acquires the lock, executes the provided function, and releases the lock afterward, ensuring proper cleanup even if the function throws an error
   * @param {Function} func - The function to execute when the lock is acquired
   * @return {Promise<any>} A promise that resolves with the result of the executed function
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(func: () => any, ...args: any[]) {
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async acquire(...args: any[]): Promise<void> {
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  release(...args: any[]) {
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
