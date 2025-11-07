import { TransactionLock } from "./interfaces/TransactionLock";
import { SynchronousLock } from "./locks/SynchronousLock";
import { DBKeys } from "@decaf-ts/db-decorators";
import "./overrides";
import { Metadata } from "@decaf-ts/decoration";
import { LoggedClass, getObjectName, Logging } from "@decaf-ts/logging";
import { TimeoutError } from "./errors";

type TransactionRunnable<R, C = unknown> = (this: C) => R | Promise<R>;

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
  static debug = false;
  static globalTimeout = -1;

  private static log = new Proxy(Logging.for(Transaction), {
    get(target, prop, receiver) {
      if (prop !== "log" || Transaction.debug)
        return Reflect.get(target, prop, receiver);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return (...args: any[]) => {
        // do nothing. ignore the log message the Transaction is not in debug mode
      };
    },
  });

  override get log() {
    if (!this["_log"]) {
      this["_log"] = Transaction.log;
    }
    return this["_log"];
  }

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
  private released = false;

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
    const log = this.log.for(this.push);
    const issuerName =
      typeof issuer === "string" ? issuer : getObjectName(issuer);
    const methodName = getObjectName(method);

    const transaction: Transaction<R> = new Transaction<R>(
      issuerName,
      methodName,
      async () => {
        const l = log.for(transaction.id.toString());
        try {
          l.verbose(`Executing transaction method ${methodName}`);
          l.debug(`With arguments: ${JSON.stringify(args)}`);
          const result = await Promise.resolve(
            method.call(transaction.bindToTransaction(issuer), ...args)
          );
          l.verbose(`Transaction method ${methodName} executed successfully`);
          l.debug(`Result: ${JSON.stringify(result)}`);
          await transaction.release();
          l.debug("lock released");
          return result;
        } catch (e: unknown) {
          await transaction.release(e as Error);
          throw e;
        }
      }
    );
    log.debug(
      `Pushing transaction ${transaction.id} for method ${methodName} on issuer ${issuerName}`
    );
    return Transaction.submit(transaction);
  }

  static async run<R, C = unknown>(
    runnable: TransactionRunnable<R, C>,
    metadata?: any[]
  ): Promise<R>;
  static async run<R, C = unknown>(
    context: C,
    runnable: TransactionRunnable<R, C>,
    metadata?: any[]
  ): Promise<R>;
  static async run<R, C = unknown>(
    contextOrRunnable: C | TransactionRunnable<R, C>,
    runnableOrMetadata?: TransactionRunnable<R, C> | any[],
    maybeMetadata?: any[]
  ): Promise<R> {
    const contextProvided = typeof contextOrRunnable !== "function";
    const context = (contextProvided ? contextOrRunnable : undefined) as
      | C
      | undefined;
    const runnable = (
      contextProvided ? runnableOrMetadata : contextOrRunnable
    ) as TransactionRunnable<R, C>;
    if (typeof runnable !== "function") {
      throw new Error("Transaction.run requires an async function");
    }
    const rawMetadata = contextProvided ? maybeMetadata : runnableOrMetadata;
    const metadataValue =
      Array.isArray(rawMetadata) && rawMetadata.length
        ? rawMetadata
        : undefined;
    const sourceName = context
      ? getObjectName(context)
      : getObjectName(runnable);
    const methodName = getObjectName(runnable);
    // eslint-disable-next-line prefer-const
    let transaction: Transaction<R>;
    const action = async () => {
      try {
        const boundContext = context
          ? transaction.bindToTransaction(context)
          : undefined;
        const result = await runnable.call((boundContext ?? transaction) as C);
        await transaction.release();
        return result;
      } catch (error) {
        await transaction.release(error as Error);
        throw error;
      }
    };
    transaction = new Transaction<R>(
      sourceName,
      methodName,
      action,
      metadataValue
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
   * @description Releases the transaction instance once
   * @summary Ensures the underlying lock is released at most a single time for the transaction
   * @param {Error} [err] - Optional error to propagate to the lock implementation
   * @return {Promise<void>} Resolves once the lock release call finishes or immediately when already released
   */
  async release(err?: Error) {
    if (this.released) return;
    this.released = true;
    await Transaction.release(err);
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
      .verbose(`Binding the ${nextTransaction.toString()} to ${this}`);
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
    const log = this.log.for(this.bindToTransaction);
    log.verbose(
      `Binding object ${getObjectName(obj)} to transaction ${this.id}`
    );
    const transactionalMethods: string[] = Metadata.transactionals(
      obj.constructor
    ) as string[];
    if (!transactionalMethods.length) return obj;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    const reservedProps = new Set<string>([
      "__transactionProxy",
      "__transactionTarget",
      typeof DBKeys.ORIGINAL === "string" ? DBKeys.ORIGINAL : "__originalObj",
    ]);
    const props = new Set<string>(
      (Metadata.properties(obj.constructor) || []).filter(
        (p) => !reservedProps.has(p)
      )
    );
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      if (!reservedProps.has(prop)) props.add(prop);
    });
    const transactionProps: string[] = Array.from(props).filter((p) => {
      const type = Metadata.type(obj.constructor, p);
      if (type && Metadata.isTransactional(type)) return true;
      const value = (obj as Record<string, unknown>)[p];
      if (
        value &&
        (typeof value === "object" || typeof value === "function") &&
        Metadata.isTransactional(value.constructor as any)
      ) {
        return true;
      }
      return false;
    });

    log.debug(
      `found transaction methods: ${transactionalMethods.join(", ")} and properties: ${transactionProps.join(", ")}`
    );
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
   * @description Applies the global timeout to the provided Promise, if configured
   * @param {Promise<R>} execution - Transaction execution promise
   * @return {Promise<R>} Promise that respects the configured global timeout
   * @private
   */
  private applyGlobalTimeout(execution: Promise<R>): Promise<R> {
    if (Transaction.globalTimeout <= 0) return execution;
    const timeoutMs = Transaction.globalTimeout;
    const log = this.log.for(this.applyGlobalTimeout);
    return new Promise<R>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        const error = new TimeoutError(
          `Transaction ${this.toString()} exceeded timeout of ${timeoutMs}ms`
        );
        log.warn(error.message);
        this.release(error).catch((releaseErr) =>
          log.error(releaseErr as Error)
        );
        reject(error);
      }, timeoutMs);

      execution
        .then((value) => {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        })
        .catch((err) => {
          settled = true;
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /**
   * @description Executes the transaction action
   * @summary Fires the transaction by executing its associated action function, throwing an error if no action is defined
   * @return {any} The result of the transaction action
   */
  fire(): Promise<R> {
    if (!this.action) throw new Error(`Missing the method`);
    const execution = this.applyGlobalTimeout(Promise.resolve(this.action()));
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
