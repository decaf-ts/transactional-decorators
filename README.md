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


![Licence](https://img.shields.io/github/license/decaf-ts/transactional-decorators.svg?style=plastic)
![GitHub language count](https://img.shields.io/github/languages/count/decaf-ts/transactional-decorators?style=plastic)
![GitHub top language](https://img.shields.io/github/languages/top/decaf-ts/transactional-decorators?style=plastic)

[![Build & Test](https://github.com/decaf-ts/transactional-decorators/actions/workflows/nodejs-build-prod.yaml/badge.svg)](https://github.com/decaf-ts/transactional-decorators/actions/workflows/nodejs-build-prod.yaml)
[![CodeQL](https://github.com/decaf-ts/transactional-decorators/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/decaf-ts/transactional-decorators/actions/workflows/codeql-analysis.yml)[![Snyk Analysis](https://github.com/decaf-ts/transactional-decorators/actions/workflows/snyk-analysis.yaml/badge.svg)](https://github.com/decaf-ts/transactional-decorators/actions/workflows/snyk-analysis.yaml)
[![Pages builder](https://github.com/decaf-ts/transactional-decorators/actions/workflows/pages.yaml/badge.svg)](https://github.com/decaf-ts/transactional-decorators/actions/workflows/pages.yaml)
[![.github/workflows/release-on-tag.yaml](https://github.com/decaf-ts/transactional-decorators/actions/workflows/release-on-tag.yaml/badge.svg?event=release)](https://github.com/decaf-ts/transactional-decorators/actions/workflows/release-on-tag.yaml)

![Open Issues](https://img.shields.io/github/issues/decaf-ts/transactional-decorators.svg)
![Closed Issues](https://img.shields.io/github/issues-closed/decaf-ts/transactional-decorators.svg)
![Pull Requests](https://img.shields.io/github/issues-pr-closed/decaf-ts/transactional-decorators.svg)
![Maintained](https://img.shields.io/badge/Maintained%3F-yes-green.svg)

![Forks](https://img.shields.io/github/forks/decaf-ts/transactional-decorators.svg)
![Stars](https://img.shields.io/github/stars/decaf-ts/transactional-decorators.svg)
![Watchers](https://img.shields.io/github/watchers/decaf-ts/transactional-decorators.svg)

![Node Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbadges%2Fshields%2Fmaster%2Fpackage.json&label=Node&query=$.engines.node&colorB=blue)
![NPM Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbadges%2Fshields%2Fmaster%2Fpackage.json&label=NPM&query=$.engines.npm&colorB=purple)

Documentation available [here](https://decaf-ts.github.io/transactional-decorators/)

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


# How to Use

This guide provides examples of how to use the main features of the `@decaf-ts/transactional-decorators` library.

## Transactional Decorator

The `@transactional` decorator ensures that a method is executed within a transaction.

```typescript
import { transactional } from '@decaf-ts/transactional-decorators';

class MyService {
  @transactional()
  async myTransactionalMethod() {
    // This method will be executed within a transaction.
  }
}
```

## Locks

The library provides different lock implementations to control concurrency.

### SynchronousLock

The `SynchronousLock` allows only one transaction to execute at a time. This is the default lock.

```typescript
import { Transaction, SynchronousLock } from '@decaf-ts/transactional-decorators';

Transaction.setLock(new SynchronousLock());
```

### MultiLock

The `MultiLock` allows multiple transactions to execute concurrently, with a configurable limit.

```typescript
import { Transaction, MultiLock } from '@decaf-ts/transactional-decorators';

// Allow up to 5 transactions to execute concurrently
Transaction.setLock(new MultiLock(5));
```

## Manual Transaction Management

You can also manage transactions manually using the `Transaction` class.

```typescript
import { Transaction } from '@decaf-ts/transactional-decorators';

const myTransaction = new Transaction(
  'MyManualTransaction',
  'myAction',
  async () => {
    // Transaction logic here
  }
);

Transaction.submit(myTransaction);
```


### Related

[![decaf-ts](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=decaf-ts)](https://github.com/decaf-ts/decaf-ts)
[![core](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=core)](https://github.com/decaf-ts/core)
[![decorator-validation](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=decorator-validation)](https://github.com/decaf-ts/decorator-validation)
[![db-decorators](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=db-decorators)](https://github.com/decaf-ts/db-decorators)


### Social

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/decaf-ts/)




#### Languages

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![ShellScript](https://img.shields.io/badge/Shell_Script-121011?style=for-the-badge&logo=gnu-bash&logoColor=white)

## Getting help

If you have bug reports, questions or suggestions please [create a new issue](https://github.com/decaf-ts/ts-workspace/issues/new/choose).

## Contributing

I am grateful for any contributions made to this project. Please read [this](./workdocs/98-Contributing.md) to get started.

## Supporting

The first and easiest way you can support it is by [Contributing](./workdocs/98-Contributing.md). Even just finding a typo in the documentation is important.

Financial support is always welcome and helps keep both me and the project alive and healthy.

So if you can, if this project in any way. either by learning something or simply by helping you save precious time, please consider donating.

## License

This project is released under the [MIT License](./LICENSE.md).

By developers, for developers...
