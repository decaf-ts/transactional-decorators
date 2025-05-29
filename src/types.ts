/**
 * @summary defines a callable as perceived by the lock
 *
 * @memberOf module:db-decorators
 */
export type LockCallable = (value?: void | PromiseLike<void>) => void;

export type Callback = (err?: Error, result?: any, ...args: any[]) => void;
