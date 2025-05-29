### Description

The Transactional Decorators library is a standalone module that provides a robust implementation for handling concurrency and transaction management in TypeScript applications. It offers a comprehensive set of tools for ensuring data integrity and thread safety in your code.

#### Core Components

- **Transaction Class**: The central class that manages the lifecycle of transactions, including creation, execution, and cleanup. It provides mechanisms for binding transactions to objects and methods, ensuring proper transaction context propagation.

- **Lock System**: A flexible locking mechanism for controlling access to shared resources:
  - `Lock`: A base class providing fundamental locking capabilities with support for queuing and executing functions when the lock is available.
  - `TransactionLock`: An interface defining the contract for transaction lock implementations that manage transaction execution order and concurrency.
  - `SyncronousLock`: A default implementation of TransactionLock that processes transactions one at a time in the order they are submitted.

- **Decorators**:
  - `@transactional()`: A method decorator that enables transactional behavior by wrapping the original method in a transaction context that handles transaction creation, binding, and error handling.
  - `transactionalSuperCall()`: A utility function for handling super calls in transactional methods, ensuring transaction continuity through the inheritance chain.

#### Key Features

- **Simple yet powerful locking**: The library provides a flexible locking system that can be customized to suit your application's needs.
- **Method decoration with `@transactional()`**: Easily add transactional behavior to your methods with a simple decorator.
- **Instance proxying**: The Transaction class can bind to objects, creating proxies that maintain transaction context across method calls.
- **Transaction chaining**: Transactions can be linked together, allowing you to group multiple operations into a single atomic transaction.
- **Customizable Transaction Lock**: You can implement your own TransactionLock to customize how transactions are processed.
- **Error handling**: The library includes built-in error handling to ensure transactions are properly released even when errors occur.
- **Seamless integration with `db-decorators`**: The library works well with the db-decorators package for database operations.

This library is ideal for applications that need to ensure data consistency and handle concurrent operations safely, such as database applications, financial systems, or any application where atomic operations are important.
