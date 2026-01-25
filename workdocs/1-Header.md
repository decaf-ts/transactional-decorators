![Banner](./workdocs/assets/decaf-logo.svg)

## Transactional Decorators

A comprehensive TypeScript library providing transaction management capabilities through decorators, locks, and utilities. This library enables atomic operations, concurrency control, and error handling in your TypeScript applications, ensuring data integrity and thread safety.

> Release docs refreshed on 2025-11-26. See [workdocs/reports/RELEASE_NOTES.md](./workdocs/reports/RELEASE_NOTES.md) for ticket summaries.

### Core Concepts

*   **`@transactional`**: A method decorator that wraps a method in a transaction, ensuring that it is executed atomically.
*   **`Transaction` Class**: The core class for managing transaction lifecycle, including creation, execution, and cleanup.
*   **Locks**: The library provides different lock implementations to control concurrency.
    *   **`SynchronousLock`**: A simple lock that allows only one transaction to execute at a time.
    *   **`MultiLock`**: A more advanced lock that allows multiple transactions to execute concurrently, with a configurable limit.
