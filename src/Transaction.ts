/**
 * @summary Transaction Class
 *
 * @param {string} source
 * @param {string} [method]
 * @param {function(): void} [action]
 * @param {any[]} [metadata]
 *
 * @class Transaction
 *
 * @category Transactions
 */
import { TransactionLock } from "./interfaces/TransactionLock";
import { Reflection } from "@decaf-ts/reflection";
import { Callback } from "./types";
import { SyncronousLock } from "./locks/SyncronousLock";
import {
  DBKeys,
  getAllPropertyDecoratorsRecursive,
} from "@decaf-ts/db-decorators";
import { getObjectName } from "./utils";
import { TransactionalKeys } from "./constants";

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
   * @summary Pushes a transaction to que queue and waits its resolution
   *
   * @param {any} issuer any class. will be used as this when calling the callbackMethod
   * @param {Function} callbackMethod callback function containing the transaction. will be called with the issuear as this
   * @param {any[]} args arguments to pass to the method. Last one must be the callback
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
   * @summary Sets the lock to be used
   * @param lock
   */
  static setLock(lock: TransactionLock) {
    this.lock = lock;
  }

  /**
   * @summary gets the lock
   */
  static getLock(): TransactionLock {
    if (!this.lock) this.lock = new SyncronousLock();
    return this.lock;
  }

  /**
   * @summary submits a transaction
   * @param {Transaction} transaction
   */
  static submit(transaction: Transaction) {
    Transaction.getLock().submit(transaction);
  }

  /**
   * @summary releases the lock
   * @param {Err} err
   */
  static async release(err?: Error) {
    return Transaction.getLock().release(err);
  }

  /**
   * @summary retrieves the metadata for the transaction
   */
  getMetadata() {
    return this.metadata ? [...this.metadata] : undefined;
  }

  /**
   * @summary Binds a new operation to the current transaction
   * @param {Transaction} nextTransaction
   */
  bindTransaction(nextTransaction: Transaction) {
    // all(`Binding the {0} to {1}`, nextTransaction, this);
    this.log.push(...nextTransaction.log);
    nextTransaction.bindTransaction = this.bindToTransaction.bind(this);
    nextTransaction.bindToTransaction = this.bindToTransaction.bind(this);
    this.action = nextTransaction.action;
  }

  /**
   * @summary Binds the Transactional Decorated Object to the transaction
   * @description by having all {@link transactional} decorated
   * methods always pass the current Transaction as an argument
   *
   * @param {any} obj
   * @return {any} the bound {@param obj}
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
   * @summary Fires the Transaction
   */
  fire() {
    if (!this.action) throw new Error(`Missing the method`);
    return this.action();
  }

  /**
   * @summary toString override
   * @param {boolean} [withId] defaults to true
   * @param {boolean} [withLog] defaults to true
   */
  toString(withId = true, withLog = false) {
    return `${withId ? `[${this.id}]` : ""}[Transaction][${this.source}.${this.method}${
      withLog ? `]\nTransaction Log:\n${this.log.join("\n")}` : "]"
    }`;
  }

  /**
   * @summary gets the transactions reflections key
   * @function getRepoKey
   * @param {string} key
   * @memberOf module:db-decorators.Transactions
   * */
  static key(key: string) {
    return TransactionalKeys.REFLECT + key;
  }
}
