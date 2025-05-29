import { Transaction } from "../Transaction";
import { TransactionLock } from "../interfaces/TransactionLock";
import { Lock } from "./Lock";

/**
 * @summary Simple Synchronous Lock implementation
 * @description for transaction management
 * adapted from {@link https://www.talkinghightech.com/en/creating-a-js-lock-for-a-resource/}
 *
 * @param {number} [counter] the number of simultaneous transactions allowed. defaults to 1
 * @param {Function} [onBegin] to be called at the start of the transaction
 * @param {Function} [onEnd] to be called at the conclusion of the transaction
 *
 * @class SyncronousLock
 * @implements TransactionLock
 */
export class SyncronousLock implements TransactionLock {
  private counter: number;
  private pendingTransactions: Transaction[];
  currentTransaction?: Transaction = undefined;
  private readonly onBegin?: () => Promise<void>;
  private readonly onEnd?: (err?: Error) => Promise<void>;

  private readonly lock = new Lock();

  constructor(
    counter: number = 1,
    onBegin?: () => Promise<void>,
    onEnd?: (err?: Error) => Promise<void>
  ) {
    this.counter = counter;
    this.pendingTransactions = [];
    this.onBegin = onBegin;
    this.onEnd = onEnd;
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
    self.lock.acquire().then(() => {
      self.currentTransaction = transaction;
      self.lock.release();
      if (self.onBegin)
        self.onBegin().then(() => {
          // all.call(
          //   self,
          //   `Firing transaction {0}. {1} remaining...`,
          //   transaction.id,
          //   this.pendingTransactions.length,
          // );
          transaction.fire();
        });
      else {
        // all.call(
        //   self,
        //   `Firing transaction {0}. {1} remaining...`,
        //   transaction.id,
        //   this.pendingTransactions.length,
        // );
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
    return new Promise<void>((resolve) => {
      self.lock.acquire().then(() => {
        if (!self.currentTransaction)
          console.warn(
            "Trying to release an unexisting transaction. should never happen..."
          );
        // debug.call(
        //   self,
        //   "Releasing transaction: {0}",
        //   self.currentTransaction?.toString(true, true),
        // );
        self.currentTransaction = undefined;
        self.lock.release();

        const afterConclusionCB = () => {
          self.lock.acquire().then(() => {
            if (self.pendingTransactions.length > 0) {
              const transaction =
                self.pendingTransactions.shift() as Transaction;

              const cb = () => self.fireTransaction(transaction);
              //
              // all(
              //   `Releasing Transaction Lock on transaction {0}`,
              //   transaction.id,
              // );

              if (
                typeof (globalThis as unknown as { window: any }).window ===
                "undefined"
              )
                globalThis.process.nextTick(cb); // if you are on node
              else setTimeout(cb, 0); // if you are in the browser
            } else {
              self.counter++;
            }
            self.lock.release();
            resolve();
          });
        };

        if (self.onEnd) self.onEnd(err).then(() => afterConclusionCB());
        else afterConclusionCB();
      });
    });
  }
}
