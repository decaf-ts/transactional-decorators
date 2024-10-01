import { TransactionalKeys } from "./constants";
import { metadata } from "@decaf-ts/reflection";
import {Transaction} from "./Transaction";
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
    metadata(getTransactionalKey(TransactionalKeys.TRANSACTIONAL), data)(target, propertyKey);

    const originalMethod = descriptor.value;

    const methodWrapper = function (this: any, ...args: any[]): Promise<any> {
      const self = this;
      return new Promise<any>((resolve, reject) => {
        const cb = (err?: Error, result?: any) => {
          Transaction.release(err).then(() => {
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
//
// /**
//  * @summary Sets a class Async method as transactional
//  *
//  * @param {any[]}  [metadata] option metadata available to the {@link TransactionLock}
//  *
//  * @function transactionalAsync
//  *
//  * @memberOf module:db-decorators.Decorators.transactions
//  */
// export function transactionalAsync(...metadata: any[]) {
//   return function (
//     target: any,
//     propertyKey: string,
//     descriptor: PropertyDescriptor,
//   ) {
//     metadasta(getTransactionalKey(TransactionalKeys.TRANSACTIONAL))
//     Reflect.defineMetadata(
//       ,
//       {
//         type: "async",
//         metadata: metadata.length ? metadata : undefined,
//       } as TransactionalMetadata,
//       target,
//       propertyKey,
//     );
//
//     const originalMethod = descriptor.value;
//
//     const methodWrapper = function (this: any, ...args: any[]) {
//       const callback: Callback = args.pop();
//       if (!callback || typeof callback !== "function")
//         throw new CriticalError(`Missing Callback`);
//
//       const cb = (err?: Err, ...args: any[]) => {
//         Transaction.release(err).then((_) => callback(err, ...args));
//       };
//
//       const self = this;
//
//       let transaction = args.shift();
//       if (transaction instanceof Transaction) {
//         const updatedTransaction: Transaction = new Transaction(
//           this.constructor.name,
//           propertyKey,
//           () => {
//             try {
//               return originalMethod.call(
//                 updatedTransaction.bindToTransaction(self),
//                 ...args,
//                 callback,
//               );
//             } catch (e: any) {
//               return callback(e);
//             }
//           },
//           metadata.length ? metadata : undefined,
//         );
//
//         transaction.bindTransaction(updatedTransaction);
//         transaction.fire();
//       } else {
//         args.unshift(transaction);
//         transaction = undefined;
//         transaction = new Transaction(
//           this.constructor.name,
//           propertyKey,
//           () => {
//             try {
//               return originalMethod.call(
//                 transaction.bindToTransaction(self),
//                 ...args,
//                 cb,
//               );
//             } catch (e: any) {
//               return cb(e);
//             }
//           },
//           metadata.length ? metadata : undefined,
//         );
//         Transaction.submit(transaction);
//       }
//     };
//
//     Object.defineProperty(methodWrapper, "name", {
//       value: propertyKey,
//     });
//     descriptor.value = methodWrapper;
//   };
// }

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
