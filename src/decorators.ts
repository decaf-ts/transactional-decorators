import { TransactionalKeys } from "./constants";
import { metadata } from "@decaf-ts/reflection";
/**
 * @summary gets the transactions reflections key
 * @function getRepoKey
 * @param {string} key
 * @memberOf module:db-decorators.Transactions
 * */

export const getTransactionalKey = (key: string) =>
  TransactionalKeys.REFLECT + key;

/**
 * @summary Sets a class Async (promise based) method as transactional
 *
 * @param {any[]}  [data] option metadata available to the {@link TransactionLock}
 *
 * @function transactionalPromise
 *
 * @memberOf module:db-decorators.Decorators.transactions
 */
export function transactionalPromise(...data: any[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    metadata();
    Reflect.defineMetadata(
      getTransactionalKey(TransactionalKeys.TRANSACTIONAL),
      getTransactionalKey(TransactionalKeys.TRANSACTIONAL),
      {
        type: "promise",
        metadata: data.length ? data : undefined,
      } as TransactionalMetadata,
      target,
      propertyKey,
    );

    const originalMethod = descriptor.value;

    const methodWrapper = function (this: any, ...args: any[]): Promise<any> {
      const self = this;
      return new Promise<any>((resolve, reject) => {
        const cb = (err: Err, result?: any) => {
          Transaction.release(err).then((_) => {
            if (err) return reject(err);
            resolve(result);
          });
        };

        let transaction = args.shift();
        if (transaction instanceof Transaction) {
          const updatedTransaction: Transaction = new Transaction(
            this.constructor.name,
            propertyKey,
            async () => {
              originalMethod
                .call(updatedTransaction.bindToTransaction(self), ...args)
                .then(resolve)
                .catch(reject);
            },
            data.length ? data : undefined,
          );

          transaction.bindTransaction(updatedTransaction);
          transaction.fire();
        } else {
          args.unshift(transaction);
          transaction = undefined;
          transaction = new Transaction(
            this.constructor.name,
            propertyKey,
            () => {
              originalMethod
                .call(transaction.bindToTransaction(self), ...args)
                .then((result: any) => cb(undefined, result))
                .catch(cb);
            },
            data.length ? data : undefined,
          );
          Transaction.submit(transaction);
        }
      });
    };

    Object.defineProperty(methodWrapper, "name", {
      value: propertyKey,
    });
    descriptor.value = methodWrapper;
  };
}

/**
 * @summary Sets a class Async method as transactional
 *
 * @param {any[]}  [metadata] option metadata available to the {@link TransactionLock}
 *
 * @function transactionalAsync
 *
 * @memberOf module:db-decorators.Decorators.transactions
 */
export function transactionalAsync(...metadata: any[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    Reflect.defineMetadata(
      getTransactionalKey(RepositoryKeys.TRANSACTIONAL),
      {
        type: "async",
        metadata: metadata.length ? metadata : undefined,
      } as TransactionalMetadata,
      target,
      propertyKey,
    );

    const originalMethod = descriptor.value;

    const methodWrapper = function (this: any, ...args: any[]) {
      const callback: Callback = args.pop();
      if (!callback || typeof callback !== "function")
        throw new CriticalError(`Missing Callback`);

      const cb = (err?: Err, ...args: any[]) => {
        Transaction.release(err).then((_) => callback(err, ...args));
      };

      const self = this;

      let transaction = args.shift();
      if (transaction instanceof Transaction) {
        const updatedTransaction: Transaction = new Transaction(
          this.constructor.name,
          propertyKey,
          () => {
            try {
              return originalMethod.call(
                updatedTransaction.bindToTransaction(self),
                ...args,
                callback,
              );
            } catch (e: any) {
              return callback(e);
            }
          },
          metadata.length ? metadata : undefined,
        );

        transaction.bindTransaction(updatedTransaction);
        transaction.fire();
      } else {
        args.unshift(transaction);
        transaction = undefined;
        transaction = new Transaction(
          this.constructor.name,
          propertyKey,
          () => {
            try {
              return originalMethod.call(
                transaction.bindToTransaction(self),
                ...args,
                cb,
              );
            } catch (e: any) {
              return cb(e);
            }
          },
          metadata.length ? metadata : undefined,
        );
        Transaction.submit(transaction);
      }
    };

    Object.defineProperty(methodWrapper, "name", {
      value: propertyKey,
    });
    descriptor.value = methodWrapper;
  };
}

/**
 * @summary The types os supported functions by the transactional implementation
 *
 * @const FunctionType
 *
 * @property {string} CALLBACK
 * @property {string} PROMISE
 * @memberOf module:db-decorators.Transactions
 */
export enum FunctionType {
  CALLBACK = "callback",
  PROMISE = "promise",
}

/**
 * @summary Sets a class method as transactional
 *
 * @param {FunctionType} type
 * @param {any[]} [metadata] any metadata you want passed to the {@link  TransactionLock}
 *
 * @function transactional
 *
 * @memberOf module:db-decorators.Decorators.transactions
 */
export function transactional(
  type: FunctionType = FunctionType.CALLBACK,
  ...metadata: any[]
) {
  switch (type) {
    case FunctionType.CALLBACK:
      return transactionalAsync(...metadata);
    case FunctionType.PROMISE:
      return transactionalPromise(...metadata);
  }
}

/**
 * @summary Util function to wrap super calls with the transaction when the super's method is also transactional
 *
 * @param {Function} method the super method (must be bound to the proper this), eg: super.create.bind(this)
 * @param {any[]} args the arguments to call the method with
 *
 * @memberOf module:db-decorators.Transaction
 */
export function transactionalSuperCall(method: Function, ...args: any) {
  const lock = Transaction.getLock();
  const currentTransaction = lock.currentTransaction;
  method(currentTransaction, ...args);
}
