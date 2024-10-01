/**
 * @summary defines a callable as perceived by the lock
 *
 * @memberOf module:db-decorators.Transactions
 */
export type LockCallable = (value?: void | PromiseLike<void>) => void;

export type Callback = (err?: Error, result?: any) => void;
