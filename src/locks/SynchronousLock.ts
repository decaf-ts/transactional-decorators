import { Transaction } from "../Transaction";
import { TransactionLock } from "../interfaces/TransactionLock";
import { Lock } from "./Lock";
import { LoggedClass } from "@decaf-ts/logging";

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
  private pendingTransactions: Transaction<any>[] = [];
  currentTransaction?: Transaction<any> = undefined;

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
  async submit<R>(transaction: Transaction<R>): Promise<R> {
    await this.lock.acquire();
    if (
      this.currentTransaction &&
      this.currentTransaction.id === transaction.id
    ) {
      this.lock.release();
      return transaction.fire();
    }
    let resultPromise: Promise<R>;
    if (this.counter > 0) {
      this.counter--;
      this.lock.release();
      resultPromise = this.fireTransaction(transaction);
    } else {
      this.pendingTransactions.push(transaction);
      resultPromise = transaction.wait();
      this.lock.release();
    }
    return resultPromise;
  }

  /**
   * @summary Executes a transaction
   *
   * @param {Transaction} transaction
   * @private
   */
  private async fireTransaction<R>(transaction: Transaction<R>): Promise<R> {
    const log = this.log.for(this.fireTransaction);
    await this.lock.acquire();
    this.currentTransaction = transaction;
    this.lock.release();
    if (this.onBegin) {
      await this.onBegin();
    }
    log.silly(
      `Starting transaction ${transaction.id}. ${this.pendingTransactions.length} remaining...`
    );
    return transaction.fire();
  }
  /**
   * @summary Releases The lock after the conclusion of a transaction
   */
  async release(err?: Error): Promise<void> {
    const log = this.log.for(this.release);

    await this.lock.acquire();
    if (!this.currentTransaction)
      log.warn(
        "Trying to release an unexisting transaction. should never happen..."
      );
    log.silly(
      `Releasing transaction ${this.currentTransaction?.toString(true, true)}`
    );
    this.currentTransaction = undefined;
    this.lock.release();

    if (this.onEnd) {
      await this.onEnd(err);
    }

    await this.lock.acquire();

    if (this.pendingTransactions.length > 0) {
      const transaction = this.pendingTransactions.shift() as Transaction<any>;

      const cb = () => {
        return this.fireTransaction.call(this, transaction).catch((err) => {
          this.log.for(this.fireTransaction).error(err);
        });
      };
      log.silly(`Releasing transaction lock on transaction ${transaction.id}`);
      if (
        typeof (globalThis as unknown as { window: any }).window === "undefined"
      )
        globalThis.process.nextTick(cb); // if you are on node
      else setTimeout(cb, 0); // if you are in the browser
    } else {
      this.counter++;
    }
    this.lock.release();
    //
    // // eslint-disable-next-line @typescript-eslint/no-this-alias
    // const self = this;
    // return new Promise<void>((resolve) => {
    //   self.lock.acquire().then(() => {
    //     if (!self.currentTransaction)
    //       log.warn(
    //         "Trying to release an unexisting transaction. should never happen..."
    //       );
    //     log.silly(
    //       `Releasing transaction ${self.currentTransaction?.toString(true, true)}`
    //     );
    //     self.currentTransaction = undefined;
    //     self.lock.release();
    //
    //     const afterConclusionCB = () => {
    //       self.lock.acquire().then(() => {
    //         if (self.pendingTransactions.length > 0) {
    //           const transaction =
    //             self.pendingTransactions.shift() as Transaction;
    //
    //           const cb = () => self.fireTransaction(transaction);
    //           log.silly(
    //             `Releasing transaction lock on transaction ${transaction.id}`
    //           );
    //           if (
    //             typeof (globalThis as unknown as { window: any }).window ===
    //             "undefined"
    //           )
    //             globalThis.process.nextTick(cb); // if you are on node
    //           else setTimeout(cb, 0); // if you are in the browser
    //         } else {
    //           self.counter++;
    //         }
    //         self.lock.release();
    //         resolve();
    //       });
    //     };
    //
    //     if (self.onEnd) self.onEnd(err).then(() => afterConclusionCB());
    //     else afterConclusionCB();
    //   });
    // });
  }
}
