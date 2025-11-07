import { Transaction } from "../Transaction";
import { TransactionLock } from "../interfaces/TransactionLock";
import { Lock } from "./Lock";
import { isBrowser, LoggedClass } from "@decaf-ts/logging";

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
  private readonly loggerCache = new Map<string, ReturnType<typeof this.log.for>>();

  override get log() {
    if (!this["_log"]) {
      this["_log"] = Transaction["log"].for(this);
    }
    return this["_log"];
  }

  private logger(method: "submit" | "fireTransaction" | "release") {
    if (!this.loggerCache.has(method)) {
      this.loggerCache.set(
        method,
        this.log.for((this as unknown as Record<string, any>)[method])
      );
    }
    return this.loggerCache.get(method) as ReturnType<typeof this.log.for>;
  }

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
    const log = this.logger("submit");
    await this.lock.acquire();
    log.silly(`Lock acquired to submit transaction ${transaction.id}`);
    if (
      this.currentTransaction &&
      this.currentTransaction.id === transaction.id
    ) {
      this.lock.release();
      log.silly(`Released lock for re-entrant transaction ${transaction.id}`);
      return transaction.fire();
    }
    let resultPromise: Promise<R>;
    if (this.counter > 0) {
      this.counter--;
      this.lock.release();
      log.silly(`Released lock for transaction ${transaction.id}`);
      resultPromise = this.fireTransaction(transaction);
    } else {
      log.debug(`Pushing transaction ${transaction.id} to the queue`);
      this.pendingTransactions.push(transaction);
      resultPromise = transaction.wait();
      this.lock.release();
      log.silly(`Released lock after queuing transaction ${transaction.id}`);
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
    const log = this.logger("fireTransaction");
    await this.lock.acquire();
    log.silly(`Lock acquired obtain transaction ${transaction.id}`);
    this.currentTransaction = transaction;
    this.lock.release();
    log.silly(`Released lock after obtaining ${transaction.id}`);
    if (this.onBegin) {
      log.verbose(`Calling onBegin for transaction ${transaction.id}`);
      await this.onBegin();
    }
    log.info(
      `Starting transaction ${transaction.id}. ${this.pendingTransactions.length} remaining...`
    );
    return transaction.fire();
  }
  /**
   * @summary Releases The lock after the conclusion of a transaction
   */
  async release(err?: Error): Promise<void> {
    const log = this.logger("release");

    await this.lock.acquire();
    if (!this.currentTransaction)
      log.warn(
        "Trying to release an unexisting transaction. should never happen..."
      );
    log.verbose(
      `Releasing transaction ${this.currentTransaction?.toString(true, true)}`
    );
    const id = this.currentTransaction?.id;
    this.currentTransaction = undefined;
    this.lock.release();
    log.silly(`Released lock after clearing transaction ${id}`);
    if (this.onEnd) {
      log.verbose(`Calling onEnd for transaction ${id}`);
      await this.onEnd(err);
    }

    await this.lock.acquire();
    log.silly(
      `Acquired lock after completing transaction ${id} for pending transaction verification`
    );
    if (this.pendingTransactions.length > 0) {
      const transaction = this.pendingTransactions.shift() as Transaction<any>;

      const cb = () => {
        return this.fireTransaction.call(this, transaction).catch((err) => {
          this.log.for(this.fireTransaction).error(err);
        });
      };
      log.silly(`Marking ${transaction.id} for execution`);
      if (!isBrowser()) {
        globalThis.process.nextTick(cb); // if you are on node
      } else {
        setTimeout(cb, 0);
      } // if you are in the browser
    } else {
      log.debug(`No pending transactions. Incrementing counter.`);
      this.counter++;
    }
    this.lock.release();
    log.silly(`Released lock after completing transaction ${id}`);
  }
}
