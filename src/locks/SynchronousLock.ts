import { Transaction } from "../Transaction";
import { TransactionLock } from "../interfaces/TransactionLock";
import { Lock } from "./Lock";
import { LoggedClass } from "@decaf-ts/logging/lib/LoggedClass";

/**
 * @summary Simple Synchronous Lock implementation
 * @description for transaction management
 * adapted from {@link https://www.talkinghightech.com/en/creating-a-js-lock-for-a-resource/}
 *
 * @param {number} [counter] the number of simultaneous transactions allowed. defaults to 1
 * @param {Function} [onBegin] to be called at the start of the transaction
 * @param {Function} [onEnd] to be called at the conclusion of the transaction
 *
 * @class SynchronousLock
 * @implements TransactionLock
 */
export class SynchronousLock extends LoggedClass implements TransactionLock {
  private pendingTransactions: Transaction[] = [];
  currentTransaction?: Transaction = undefined;

  private readonly lock = new Lock();

  constructor(
    private counter: number = 1,
    private readonly onBegin?: () => Promise<void>,
    private readonly onEnd?: (err?: Error) => Promise<void>
  ) {
    super();
  }

  /**
   * @summary Submits a transaction to be processed
   * @param {Transaction} transaction
   */
  submit(transaction: Transaction): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    self.lock.acquire().then(() => {
      if (
        self.currentTransaction &&
        self.currentTransaction.id === transaction.id
      ) {
        self.lock.release();
        return transaction.fire();
      }

      if (self.counter > 0) {
        self.counter--;
        self.lock.release();
        return self.fireTransaction(transaction);
      } else {
        self.pendingTransactions.push(transaction);
        self.lock.release();
      }
    });
  }

  /**
   * @summary Executes a transaction
   *
   * @param {Transaction} transaction
   * @private
   */
  private fireTransaction(transaction: Transaction) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const log = this.log.for(this.fireTransaction);
    self.lock.acquire().then(async () => {
      self.currentTransaction = transaction;
      self.lock.release();
      if (self.onBegin) {
        await self.onBegin();
        log.silly(
          `Firing transaction ${transaction.id}. ${this.pendingTransactions.length} remaining...`
        );
        transaction.fire();
      } else {
        log.silly(
          `Firing transaction ${transaction.id}. ${this.pendingTransactions.length} remaining...`
        );
        transaction.fire();
      }
    });
  }
  /**
   * @summary Releases The lock after the conclusion of a transaction
   */
  async release(err?: Error): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const log = this.log.for(this.release);
    await this.lock.acquire();

    if (!this.currentTransaction)
      log.error(
        `Trying to release an unexisting transaction. should never happen...`
      );

    log.silly(
      `Releasing transaction ${this.currentTransaction?.toString(true, true)}`
    );
    this.currentTransaction = undefined;
    this.lock.release();

    if (this.onEnd) await this.onEnd(err);

    await this.lock.acquire();

    if (this.pendingTransactions.length > 0) {
      const transaction = this.pendingTransactions.shift() as Transaction;
      log.silly(`Releasing transaction ${transaction.id}.`);
      const cb = () => self.fireTransaction(transaction);

      if (
        typeof (globalThis as unknown as { window: any }).window === "undefined"
      ) {
        globalThis.process.nextTick(cb); // if you are on node
      } else {
        setTimeout(cb, 0); // if you are in the browser
      }
    } else {
      self.counter++;
    }
    self.lock.release();
  }
}
