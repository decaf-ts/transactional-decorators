/**
 * @typedef {Object} TransactionalKeysType
 * @property {string} REFLECT - Key used for reflection metadata related to transactional models
 * @property {string} TRANSACTIONAL - Key used to identify transactional properties
 * @memberOf module:transactions
 */

/**
 * @description Keys used for transactional operations
 * @summary Constant object containing string keys used throughout the transactional system for reflection and identification
 * @type {TransactionalKeysType}
 * @const TransactionalKeys
 * @memberOf module:transactions
 */
export const TransactionalKeys: Record<string, string> = {
  TRANSACTIONAL: "transactional",
};
