import { TransactionLock } from "./interfaces/TransactionLock";
import { Reflection } from "@decaf-ts/reflection";
import { Callback } from "./types";
import { SynchronousLock } from "./locks/SynchronousLock";
import {
  DBKeys,
  getAllPropertyDecoratorsRecursive,
} from "@decaf-ts/db-decorators";
import { getObjectName } from "./utils";
import { TransactionalKeys } from "./constants";

/**
 * @description Core transaction management class
 * @summary Manages transaction lifecycle, including creation, execution, and cleanup. Provides mechanisms for binding transactions to objects and methods, ensuring proper transaction context propagation.
 * @param {string} source - The source/origin of the transaction (typically a class name)
 * @param {string} [method] - The method name associated with the transaction
 * @param {function(): any} [action] - The function to execute within the transaction
 * @param {any[]} [metadata] - Additional metadata to associate with the transaction
 * @class Transaction
 * @example
 * // Creating and submitting a transaction
 * const transaction = new Transaction(
 *   'UserService',
 *   'createUser',
 *   async () => {
 *     // Transaction logic here
 *     await db.insert('users', { name: 'John' });
 *   }
 * );
 * Transaction.submit(transaction);
 *
 * // Using the transactional decorator
 * class UserService {
 *   @transactional()
 *   async createUser(data) {
 *     // Method will be executed within a transaction
 *     return await db.insert('users', data);
 *   }
 * }
 * @mermaid
 * sequenceDiagram
 *   participant C as Client Code
 *   participant T as Transaction
 *   participant L as TransactionLock
 *   participant O as Original Method
 *
 *   C->>T: new Transaction(source, method, action)
 *   C->>T: Transaction.submit(transaction)
 *   T->>L: submit(transaction)
 *   L->>T: fire()
 *   T->>O: Execute action()
 *   O-->>T: Return result/error
 *   T->>L: release(error?)
 *   L-->>C: Return result/error
 */
export class Transaction {
  readonly id: number;
  protected action?: () => any;
  readonly method?: string;
  readonly source?: string;
  readonly log: string[];
  private readonly metadata?: any[];

  private static lock: TransactionLock;

  constructor(
    source: string,
    method?: string,
    action?: () => any,
    metadata?: any[]
  ) {
    this.id = Date.now();
    this.action = action;
    this.method = method;
    this.log = [[this.id, source, method].join(" | ")];
    this.source = source;
    this.metadata = metadata;
  }

  /**
   * @description Queues a transaction for execution
   * @summary Pushes a transaction to the queue and waits for its resolution. Creates a new transaction with the provided issuer and callback method, then submits it to the transaction lock.
   * @param {any} issuer - Any class instance that will be used as 'this' when calling the callbackMethod
   * @param {Function} callbackMethod - Callback function containing the transaction logic, will be called with the issuer as 'this'
   * @param {any[]} args - Arguments to pass to the method. Last one must be the callback function
   * @return {void}
   */
  static push(
    issuer: any,
    callbackMethod: (...argzz: (any | Callback)[]) => void,
    ...args: (any | Callback)[]
  ) {
    const callback: Callback = args.pop();
    if (!callback || typeof callback !== "function")
      throw new Error("Missing callback");
    const cb = (err?: Error, ...args: any[]) => {
      Transaction.getLock()
        .release(err)
        .then(() => callback(err, ...args));
    };
    const transaction: Transaction = new Transaction(
      issuer.constructor.name,
      callbackMethod.name ? getObjectName(callbackMethod) : "Anonymous",
      () => {
        return callbackMethod.call(
          transaction.bindToTransaction(issuer),
          ...args,
          cb
        );
      }
    );
    Transaction.getLock().submit(transaction);
  }

  /**
   * @description Configures the transaction lock implementation
   * @summary Sets the lock implementation to be used for transaction management, allowing customization of the transaction behavior
   * @param {TransactionLock} lock - The lock implementation to use for managing transactions
   * @return {void}
   */
  static setLock(lock: TransactionLock) {
    this.lock = lock;
  }

  /**
   * @description Retrieves the current transaction lock
   * @summary Gets the current transaction lock instance, creating a default SyncronousLock if none exists
   * @return {TransactionLock} The current transaction lock implementation
   */
  static getLock(): TransactionLock {
    if (!this.lock) this.lock = new SynchronousLock();
    return this.lock;
  }

  /**
   * @description Submits a transaction for processing
   * @summary Submits a transaction to the current transaction lock for processing and execution
   * @param {Transaction} transaction - The transaction to submit for processing
   * @return {void}
   */
  static submit(transaction: Transaction) {
    Transaction.getLock().submit(transaction);
  }

  /**
   * @description Releases the transaction lock
   * @summary Releases the current transaction lock, optionally with an error, allowing the next transaction to proceed
   * @param {Error} [err] - Optional error that occurred during transaction execution
   * @return {Promise<void>} A promise that resolves when the lock has been released
   */
  static async release(err?: Error) {
    return Transaction.getLock().release(err);
  }

  /**
   * @description Retrieves transaction metadata
   * @summary Returns a copy of the metadata associated with this transaction, ensuring the original metadata remains unmodified
   * @return {any[] | undefined} A copy of the transaction metadata or undefined if no metadata exists
   */
  getMetadata() {
    return this.metadata ? [...this.metadata] : undefined;
  }

  /**
   * @description Links a new transaction to the current one
   * @summary Binds a new transaction operation to the current transaction, transferring logs and binding methods to maintain transaction context
   * @param {Transaction} nextTransaction - The new transaction to bind to the current one
   * @return {void}
   */
  bindTransaction(nextTransaction: Transaction) {
    // all(`Binding the {0} to {1}`, nextTransaction, this);
    this.log.push(...nextTransaction.log);
    nextTransaction.bindTransaction = this.bindToTransaction.bind(this);
    nextTransaction.bindToTransaction = this.bindToTransaction.bind(this);
    this.action = nextTransaction.action;
  }

  /**
   * @description Binds an object to the current transaction context
   * @summary Binds a transactional decorated object to the transaction by ensuring all transactional methods automatically receive the current transaction as their first argument
   * @param {any} obj - The object to bind to the transaction
   * @return {any} The bound object with transaction-aware method wrappers
   */
  bindToTransaction(obj: any): any {
    const transactionalMethods = getAllPropertyDecoratorsRecursive(
      obj,
      undefined,
      TransactionalKeys.REFLECT
    );
    if (!transactionalMethods) return obj;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    const boundObj = Reflection.getAllProperties(obj).reduce(
      (accum: any, k: string) => {
        if (
          Object.keys(transactionalMethods).indexOf(k) !== -1 &&
          transactionalMethods[k].find(
            (o) => o.key === TransactionalKeys.TRANSACTIONAL
          )
        )
          accum[k] = (...args: any[]) =>
            obj[k].call(obj.__originalObj || obj, self, ...args);
        else if (k === "clazz" || k === "constructor") accum[k] = obj[k];
        else if (typeof obj[k] === "function")
          accum[k] = obj[k].bind(obj.__originalObj || obj);
        else if (typeof obj[k] === "object" && obj[k].constructor) {
          const decs = Reflection.getClassDecorators(
            TransactionalKeys.REFLECT,
            obj[k]
          );
          if (decs.find((e: any) => e.key === TransactionalKeys.TRANSACTIONAL))
            accum[k] = self.bindToTransaction(obj[k]);
          else accum[k] = obj[k];
        } else accum[k] = obj[k];

        return accum;
      },
      {}
    );

    boundObj[DBKeys.ORIGINAL] = obj[DBKeys.ORIGINAL] || obj;
    boundObj.toString = () =>
      getObjectName(boundObj[DBKeys.ORIGINAL]) +
      " proxy for transaction " +
      this.id;

    return boundObj;
  }

  /**
   * @description Executes the transaction action
   * @summary Fires the transaction by executing its associated action function, throwing an error if no action is defined
   * @return {any} The result of the transaction action
   */
  fire() {
    if (!this.action) throw new Error(`Missing the method`);
    return this.action();
  }

  /**
   * @description Provides a string representation of the transaction
   * @summary Overrides the default toString method to provide a formatted string representation of the transaction, optionally including the transaction ID and log
   * @param {boolean} [withId=true] - Whether to include the transaction ID in the output
   * @param {boolean} [withLog=false] - Whether to include the transaction log in the output
   * @return {string} A string representation of the transaction
   */
  toString(withId = true, withLog = false) {
    return `${withId ? `[${this.id}]` : ""}[Transaction][${this.source}.${this.method}${
      withLog ? `]\nTransaction Log:\n${this.log.join("\n")}` : "]"
    }`;
  }

  /**
   * @description Generates a reflection metadata key for transactions
   * @summary Creates a prefixed reflection key for transaction-related metadata, ensuring proper namespacing
   * @param {string} key - The base key to prefix with the transaction reflection namespace
   * @return {string} The complete reflection key for transaction metadata
   * @function key
   */
  static key(key: string) {
    return TransactionalKeys.REFLECT + key;
  }
}
