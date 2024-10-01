import { Transaction } from "../Lock";

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
 *
 * @category Transactions
 */
export class SyncronousLock implements TransactionLock {
  private counter: number;
  private pendingTransactions: Transaction[];
  currentTransaction?: Transaction = undefined;
  private readonly onBegin?: () => Promise<void>;
  private readonly onEnd?: (err?: Err) => Promise<void>;

  private readonly lock = new Lock();

  constructor(
    counter: number = 1,
    onBegin?: () => Promise<void>,
    onEnd?: (err?: Err) => Promise<void>,
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
    const self = this;
    self.lock.acquire(self.submit.name).then((_) => {
      if (
        self.currentTransaction &&
        self.currentTransaction.id === transaction.id
      ) {
        self.lock.release(self.submit.name);
        all(`Continuing transaction {0}`, transaction.id);
        return transaction.fire();
      }

      if (self.counter > 0) {
        self.counter--;
        self.lock.release(self.submit.name);
        return self.fireTransaction(transaction);
      } else {
        all(`Locking transaction {0}`, transaction.id);
        self.pendingTransactions.push(transaction);
        self.lock.release(self.submit.name);
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
    const self = this;
    self.lock.acquire(self.fireTransaction.name).then((_) => {
      self.currentTransaction = transaction;
      self.lock.release(self.fireTransaction.name);
      if (self.onBegin)
        self
          .onBegin()
          .then((_) =>
            all.call(
              self,
              `Called onBegin before firing transaction {0}`,
              transaction.id,
            ),
          )
          .catch((e: any) =>
            error.call(self, "Failed to run transaction onBegin: {0}", e),
          )
          .then((_) => {
            all.call(
              self,
              `Firing transaction {0}. {1} remaining...`,
              transaction.id,
              this.pendingTransactions.length,
            );
            transaction.fire();
          });
      else {
        all.call(
          self,
          `Firing transaction {0}. {1} remaining...`,
          transaction.id,
          this.pendingTransactions.length,
        );
        transaction.fire();
      }
    });
  }
  /**
   * @summary Releases The lock after the conclusion of a transaction
   */
  async release(err?: Err): Promise<void> {
    const self = this;
    return new Promise<void>((resolve) => {
      self.lock.acquire(self.release.name).then((_) => {
        if (!self.currentTransaction)
          warn.call(
            self,
            "Trying to release an unexisting transaction. should never happen...",
          );
        debug.call(
          self,
          "Releasing transaction: {0}",
          self.currentTransaction?.toString(true, true),
        );
        self.currentTransaction = undefined;
        self.lock.release(self.release.name);

        const afterConclusionCB = () => {
          self.lock.acquire(self.release.name).then((_) => {
            if (self.pendingTransactions.length > 0) {
              const transaction =
                self.pendingTransactions.shift() as Transaction;

              const cb = () => self.fireTransaction.call(self, transaction);

              all(
                `Releasing Transaction Lock on transaction {0}`,
                transaction.id,
              );

              if (
                typeof (globalThis as unknown as { window: any }).window ===
                "undefined"
              )
                globalThis.process.nextTick(cb); // if you are on node
              else setTimeout(cb, 0); // if you are in the browser
            } else {
              self.counter++;
            }
            self.lock.release(self.release.name);
            resolve();
          });
        };

        if (self.onEnd)
          self
            .onEnd(err)
            .then((_) => all(`Called onEnd before releasing transaction`))
            .catch((e: any) =>
              error.call(self, "Failed to run transaction onEnd: {0}", e),
            )
            .then((_) => afterConclusionCB());
        else afterConclusionCB();
      });
    });
  }
}
