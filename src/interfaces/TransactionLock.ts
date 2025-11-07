import { Transaction } from "../Transaction";

/**
 * @description Interface for transaction lock implementations
 * @summary Defines the contract for transaction lock implementations that manage transaction execution order and concurrency
 * @interface TransactionLock
 * @memberOf module:transactions
 */
export interface TransactionLock {
  /**
   * @description Current active transaction reference
   * @summary Stores a reference to the currently executing transaction, allowing access to the active transaction context
   */
  currentTransaction?: Transaction<any>;
  /**
   * @description Submits a transaction for processing
   * @summary Adds a transaction to the processing queue and handles its execution according to the lock's concurrency rules
   * @param {Transaction} transaction - The transaction to be processed
   * @return {void}
   */
  submit<R>(transaction: Transaction<R>): Promise<R>;

  /**
   * @description Releases the transaction lock
   * @summary Releases the lock after the conclusion of a transaction, allowing the next transaction to proceed, and handles any errors that occurred
   * @param {Error} [err] - The error (if any) that caused the transaction to release the lock
   * @return {Promise<void>} A promise that resolves when the lock has been released
   */
  release(err?: Error): Promise<void>;
}
