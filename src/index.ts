import { Metadata } from "@decaf-ts/decoration";

export * from "./interfaces";
export * from "./locks";
export * from "./overrides";
export * from "./constants";
export * from "./errors";
export * from "./decorators";
export * from "./Transaction";
export * from "./types";

/**
 * @description Transactional decorators for TypeScript
 * @summary A comprehensive module providing transaction management capabilities for TypeScript applications. This module exposes decorators, locks, and utilities for implementing transactional behavior in your code, allowing for atomic operations, concurrency control, and error handling.
 * @module transactions
 */

/**
 * @description Package version identifier
 * @summary Stores the current package version string, used for version tracking and compatibility checks
 * @const VERSION
 * @memberOf module:transactions
 */
export const VERSION = "##VERSION##";

/**
 * @description Represents the current commit hash of the module build.
 * @summary Stores the current git commit hash for the package. The build replaces
 * the placeholder with the actual commit hash at publish time.
 * @const COMMIT
 */
export const COMMIT = "##COMMIT##";

/**
 * @description Represents the full version string of the module.
 * @summary Stores the semver version and commit hash for the package.
 * The build replaces the placeholder with the actual `<version>-<commit>` value at publish time.
 * @const FULL_VERSION
 */
export const FULL_VERSION = "##FULL_VERSION##";


export const PACKAGE_NAME = "##PACKAGE##";

Metadata.registerLibrary(PACKAGE_NAME, VERSION);
