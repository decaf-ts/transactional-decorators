import {Transaction} from "../Transaction";

/**
 * @summary Transaction lock interface
 * @interface TransactionLock
 *
 * @category Transactions
 */
export interface TransactionLock {
  /**
   * @summary stores the current transactions
   * @property currentTransaction
   */
  currentTransaction?: Transaction;
  /**
   * @summary Submits a transaction to be processed
   * @param {Transaction} transaction
   * @method
   */
  submit(transaction: Transaction): void;

  /**
   * @summary Releases The lock after the conclusion of a transaction
   * @param {Err} [err] the error (if any) that caused the release
   * @method
   */
  release(err?: Error): Promise<void>;
}
