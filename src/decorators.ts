import { TransactionalKeys } from "./constants";
import { metadata } from "@decaf-ts/reflection";
import { Transaction } from "./Transaction";
import { InternalError } from "@decaf-ts/db-decorators";

/**
 * @description Method decorator that enables transactional behavior
 * @summary Sets a class async method as transactional, wrapping it in a transaction context that can be managed by the transaction system. This decorator handles transaction creation, binding, and error handling.
 * @param {any[]} [data] - Optional metadata available to the {@link TransactionLock} implementation
 * @return {Function} A decorator function that wraps the original method with transactional behavior
 * @function transactional
 * @category Method Decorators
 * @mermaid
 * sequenceDiagram
 *   participant C as Client Code
 *   participant D as Decorator
 *   participant T as Transaction
 *   participant O as Original Method
 *
 *   C->>D: Call decorated method
 *   D->>D: Check if transaction exists in args
 *
 *   alt Transaction exists in args
 *     D->>T: Create updated transaction
 *     T->>T: Bind to original transaction
 *     T->>T: Fire transaction
 *   else No transaction
 *     D->>T: Create new transaction
 *     T->>T: Submit transaction
 *   end
 *
 *   T->>O: Execute original method
 *   O-->>T: Return result/error
 *   T->>T: Release transaction
 *   T-->>C: Return result/error
 * @category Decorators
 */
export function transactional(...data: any[]) {
  return function (
    target: any,
    propertyKey?: any,
    descriptor?: PropertyDescriptor
  ) {
    if (!descriptor)
      throw new InternalError("Missing descriptor. Should be impossible");
    metadata(Transaction.key(TransactionalKeys.TRANSACTIONAL), data)(
      target,
      propertyKey
    );

    const originalMethod = descriptor.value;

    const methodWrapper = function (this: any, ...args: any[]): Promise<any> {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
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
            data.length ? data : undefined
          );

          transaction.bindTransaction(updatedTransaction);
          transaction.fire();
        } else {
          args.unshift(transaction);
          transaction = new Transaction(
            this.constructor.name,
            propertyKey,
            () => {
              originalMethod
                .call(transaction.bindToTransaction(self), ...args)
                .then((result: any) => cb(undefined, result))
                .catch(cb);
            },
            data.length ? data : undefined
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
 * @description Utility for handling super calls in transactional methods
 * @summary Wraps super method calls with the current transaction context when the super's method is also transactional, ensuring transaction continuity through the inheritance chain
 * @param {Function} method - The super method (must be bound to the proper this), e.g., super.create.bind(this)
 * @param {any[]} args - The arguments to call the method with
 * @return {any} The result of the super method call
 * @function transactionalSuperCall
 * @memberOf module:transactions
 */
export function transactionalSuperCall(method: any, ...args: any) {
  const lock = Transaction.getLock();
  const currentTransaction = lock.currentTransaction;
  return method(currentTransaction, ...args);
}
