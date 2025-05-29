/**
 * @description Function type for transaction lock callbacks
 * @summary Defines a callable function type as perceived by the transaction lock, used for resolving promises in the lock implementation
 * @typedef {Function} LockCallable
 * @memberOf module:transactions
 */
export type LockCallable = (value?: void | PromiseLike<void>) => void;

/**
 * @description Standard callback function type for asynchronous operations
 * @summary Defines a Node.js-style callback function that receives an optional error as the first parameter and optional result and additional arguments
 * @typedef {Function} Callback
 * @param {Error} [err] - Optional error object if the operation failed
 * @param {any} [result] - Optional result of the operation if successful
 * @param {...any} [args] - Additional arguments that may be passed to the callback
 * @memberOf module:transactions
 */
export type Callback = (err?: Error, result?: any, ...args: any[]) => void;
