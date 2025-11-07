import { TransactionalKeys } from "./constants";
import { Metadata, method } from "@decaf-ts/decoration";
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
  return function (target: any, propertyKey?: any, descriptor?: any) {
    if (!descriptor)
      throw new InternalError("This decorator only applies to methods");
    method()(target, propertyKey, descriptor);
    Metadata.set(
      target.constructor,
      Metadata.key(TransactionalKeys.TRANSACTIONAL, propertyKey),
      {
        data: data,
      }
    );
    descriptor.value = new Proxy(descriptor.value, {
      async apply<R>(obj: any, thisArg: any, argArray: any[]): Promise<R> {
        return new Promise<R>((resolve, reject) => {
          async function exitFunction(
            transaction: Transaction<R>,
            err?: Error | R,
            result?: R
          ): Promise<R> {
            if (err && !(err instanceof Error) && !result) {
              result = err;
              err = undefined;
            }
            await transaction.release(err as Error | undefined);
            return err
              ? (reject(err) as unknown as R)
              : (resolve(result as R) as unknown as R);
          }

          const candidate = argArray[0];
          const transactionPrefixLength = (() => {
            let count = 0;
            while (
              count < argArray.length &&
              argArray[count] instanceof Transaction
            ) {
              count++;
            }
            return count;
          })();
          const invocationArgs =
            transactionPrefixLength > 0
              ? argArray.slice(transactionPrefixLength)
              : argArray;

          const activeTransaction =
            candidate instanceof Transaction
              ? candidate
              : Transaction.contextTransaction(thisArg);

          if (activeTransaction) {
            const updatedTransaction: Transaction<any> = new Transaction(
              target.name,
              propertyKey,
              async () => {
                try {
                  return resolve(
                    await Reflect.apply(
                      obj,
                      updatedTransaction.bindToTransaction(thisArg),
                      invocationArgs
                    )
                  );
                } catch (e: unknown) {
                  return reject(e);
                }
              },
              data.length ? data : undefined
            );
            activeTransaction.bindTransaction(updatedTransaction);
            activeTransaction.fire();
          } else {
            const newTransaction: Transaction<R> = new Transaction(
              target.name,
              propertyKey,
              async () => {
                try {
                  return exitFunction(
                    newTransaction,
                    undefined,
                    await Reflect.apply(
                      obj,
                      newTransaction.bindToTransaction(thisArg),
                      invocationArgs
                    )
                  );
                } catch (e: unknown) {
                  return exitFunction(newTransaction, e as Error);
                }
              },
              data.length ? data : undefined
            );
            Transaction.submit(newTransaction);
          }
        });
      },
    });

    return descriptor;
  };
}
