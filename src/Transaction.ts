import { TransactionLock } from "./interfaces/TransactionLock";
import { SynchronousLock } from "./locks/SynchronousLock";
import { DBKeys } from "@decaf-ts/db-decorators";
import "./overrides";
import { Metadata } from "@decaf-ts/decoration";
import { LoggedClass, getObjectName } from "@decaf-ts/logging";

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
export class Transaction<R> extends LoggedClass {
  readonly id: number;
  protected action?: () => Promise<R>;
  readonly method?: string;
  readonly source?: string;
  readonly logs: string[];
  private readonly metadata?: any[];
  private readonly completion: Promise<R>;
  private resolveCompletion?: (value: R) => void;
  private rejectCompletion?: (reason?: unknown) => void;
  private initialFireDispatched = false;

  private static lock: TransactionLock;
  private static readonly contexts = new WeakMap<object, Transaction<any>>();

  constructor(
    source: string,
    method?: string,
    action?: () => Promise<R>,
    metadata?: any[]
  ) {
    super();
    this.id = Date.now();
    this.action = action;
    this.method = method;
    this.logs = [[this.id, source, method].join(" | ")];
    this.source = source;
    this.metadata = metadata;
    this.completion = new Promise<R>((resolve, reject) => {
      this.resolveCompletion = resolve;
      this.rejectCompletion = reject;
    });
  }

  /**
   * @description Queues a transaction for execution
   * @summary Pushes a transaction to the queue and waits for its resolution. Creates a new transaction with the provided issuer and callback method, then submits it to the transaction lock.
   * @param {any} issuer - Any class instance that will be used as 'this' when calling the callbackMethod
   * @param {Function} method - function containing the transaction logic, will be called with the issuer as 'this'
   * @param {any[]} args - Arguments to pass to the method. Last one must be the callback function
   * @return {void}
   */
  static async push<R>(
    issuer: any,
    method: (...argzz: any[]) => Promise<R>,
    ...args: any[]
  ): Promise<R> {
    const transaction: Transaction<R> = new Transaction<R>(
      getObjectName(issuer),
      getObjectName(method),
      async () => {
        try {
          const result = await Promise.resolve(
            method.call(transaction.bindToTransaction(issuer), ...args)
          );
          await Transaction.getLock().release();
          return result;
        } catch (e: unknown) {
          await Transaction.getLock().release(e as Error);
          throw e;
        }
      }
    );
    return Transaction.submit(transaction);
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
  static submit<R>(transaction: Transaction<R>): Promise<R> {
    return Transaction.getLock().submit(transaction);
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
  bindTransaction(nextTransaction: Transaction<any>) {
    this.log
      .for(this.bindTransaction)
      .silly(`Binding the ${nextTransaction.toString()} to ${this}`);
    this.logs.push(...nextTransaction.logs);
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
    const transactionalMethods: string[] = Metadata.transactionals(
      obj.constructor
    ) as string[];
    if (!transactionalMethods.length) return obj;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    const props = Metadata.properties(obj.constructor) || [];
    const transactionProps: string[] = props.filter((p) => {
      const type = Metadata.type(obj.constructor, p);
      return Metadata.isTransactional(type);
    });

    const boundObj = new Proxy(obj, {
      get(target, prop, receiver) {
        if (transactionalMethods.includes(prop as string))
          return new Proxy(target[prop as keyof typeof target] as any, {
            apply(methodTarget, thisArg, argArray) {
              return Reflect.apply(methodTarget, thisArg, [self, ...argArray]);
            },
          });

        if (transactionProps.includes(prop as string))
          return self.bindToTransaction(target[prop as keyof typeof target]);

        return Reflect.get(target, prop, receiver);
      },
    });

    boundObj[DBKeys.ORIGINAL as keyof typeof boundObj] =
      obj[DBKeys.ORIGINAL] || obj;
    boundObj.toString = () =>
      getObjectName(boundObj[DBKeys.ORIGINAL as keyof typeof boundObj]) +
      " proxy for transaction " +
      this.id;
    (boundObj as any).__transactionProxy = true;
    (boundObj as any).__transactionTarget =
      (obj as any).__transactionTarget || obj;
    Transaction.contexts.set(boundObj, self);

    return boundObj;
  }

  /**
   * @description Executes the transaction action
   * @summary Fires the transaction by executing its associated action function, throwing an error if no action is defined
   * @return {any} The result of the transaction action
   */
  fire(): Promise<R> {
    if (!this.action) throw new Error(`Missing the method`);
    const execution = this.action();
    if (!this.initialFireDispatched) {
      this.initialFireDispatched = true;
      execution
        .then((result) => {
          this.resolveCompletion?.(result);
          return result;
        })
        .catch((err) => {
          this.rejectCompletion?.(err);
          throw err;
        });
    }
    return execution;
  }

  /**
   * @description Provides a string representation of the transaction
   * @summary Overrides the default toString method to provide a formatted string representation of the transaction, optionally including the transaction ID and log
   * @param {boolean} [withId=true] - Whether to include the transaction ID in the output
   * @param {boolean} [withLog=false] - Whether to include the transaction log in the output
   * @return {string} A string representation of the transaction
   */
  override toString(withId = true, withLog = false) {
    return `${withId ? `[${this.id}]` : ""}[Transaction][${this.source}.${this.method}${
      withLog ? `]\nTransaction Log:\n${this.logs.join("\n")}` : "]"
    }`;
  }

  static contextTransaction(context: any): Transaction<any> | undefined {
    if (!context || !(context as any).__transactionProxy) {
      return undefined;
    }
    return this.contexts.get(context);
  }

  wait(): Promise<R> {
    return this.completion;
  }
}
