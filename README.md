![Banner](./workdocs/assets/decaf-logo.svg)

## Transactional Decorators

A comprehensive TypeScript library providing transaction management capabilities through decorators, locks, and utilities. This library enables atomic operations, concurrency control, and error handling in your TypeScript applications, ensuring data integrity and thread safety.


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


### How to Use

- [Initial Setup](./tutorials/For%20Developers.md#_initial-setup_)
- [Installation](./tutorials/For%20Developers.md#installation)

#### Using the @transactional Decorator

The `@transactional` decorator is the simplest way to add transactional behavior to your methods.

**Description**: Add transactional behavior to a class method, ensuring that the method executes within a transaction context.

```typescript
import { transactional } from '@decaf-ts/transactional-decorators';

class UserService {
  @transactional()
  async createUser(userData: any): Promise<any> {
    // This method will be executed within a transaction
    // If an error occurs, the transaction will be released with the error
    const user = await this.userRepository.save(userData);
    return user;
  }

  @transactional(['custom', 'metadata'])
  async updateUser(userId: string, userData: any): Promise<any> {
    // You can pass custom metadata to the transaction
    const user = await this.userRepository.findById(userId);
    Object.assign(user, userData);
    return await this.userRepository.save(user);
  }
}

// Using the transactional method
const userService = new UserService();
const newUser = await userService.createUser({ name: 'John Doe' });
```

#### Using the Transaction Class Directly

For more control over the transaction lifecycle, you can use the Transaction class directly.

**Description**: Create and manage transactions manually for complex scenarios or when you need fine-grained control.

```typescript
import { Transaction } from '@decaf-ts/transactional-decorators';

// Creating a transaction
const transaction = new Transaction(
  'UserService', // Source
  'createUser',  // Method name
  async () => {
    // Transaction logic here
    const user = await userRepository.save({ name: 'John Doe' });
    return user;
  }
);

// Submitting the transaction for execution
await Transaction.submit(transaction);

// Using the Transaction.push method for callback-style APIs
Transaction.push(
  userService, // The object instance
  userService.createUserWithCallback, // The method to call
  { name: 'John Doe' }, // Arguments
  (err, user) => {
    if (err) {
      console.error('Error creating user:', err);
      return;
    }
    console.log('User created:', user);
  }
);
```

#### Handling Super Calls in Transactional Methods

When extending a class with transactional methods, you can use the `transactionalSuperCall` utility to ensure transaction continuity.

**Description**: Maintain transaction context when calling a superclass method that is also transactional.

```typescript
import { transactional, transactionalSuperCall } from '@decaf-ts/transactional-decorators';

class BaseRepository {
  @transactional()
  async save(entity: any): Promise<any> {
    // Base save implementation
    return entity;
  }
}

class UserRepository extends BaseRepository {
  @transactional()
  async save(user: any): Promise<any> {
    // Pre-processing
    user.updatedAt = new Date();

    // Call the super method with transaction context
    const result = await transactionalSuperCall(super.save.bind(this), user);

    // Post-processing
    console.log('User saved:', result);
    return result;
  }
}
```

#### Customizing the Transaction Lock

You can implement your own TransactionLock to customize how transactions are processed.

**Description**: Create a custom transaction lock implementation for specialized concurrency control.

```typescript
import { TransactionLock, Transaction } from '@decaf-ts/transactional-decorators';

// Custom transaction lock that logs transactions
class LoggingTransactionLock implements TransactionLock {
  currentTransaction?: Transaction;
  private pendingTransactions: Transaction[] = [];

  submit(transaction: Transaction): void {
    console.log(`Submitting transaction: ${transaction.toString()}`);

    if (this.currentTransaction) {
      this.pendingTransactions.push(transaction);
      console.log(`Transaction queued. Queue length: ${this.pendingTransactions.length}`);
    } else {
      this.currentTransaction = transaction;
      console.log(`Executing transaction immediately`);
      transaction.fire();
    }
  }

  async release(err?: Error): Promise<void> {
    if (err) {
      console.error(`Transaction error: ${err.message}`);
    } else {
      console.log(`Transaction completed successfully`);
    }

    this.currentTransaction = undefined;

    if (this.pendingTransactions.length > 0) {
      const nextTransaction = this.pendingTransactions.shift()!;
      console.log(`Processing next transaction: ${nextTransaction.toString()}`);
      this.currentTransaction = nextTransaction;
      nextTransaction.fire();
    }

    return Promise.resolve();
  }
}

// Set the custom lock as the default
Transaction.setLock(new LoggingTransactionLock());
```

#### Using the Lock Class

The Lock class provides a basic locking mechanism that you can use independently of the transaction system.

**Description**: Use the Lock class for simple concurrency control in non-transactional contexts.

```typescript
import { Lock } from '@decaf-ts/transactional-decorators';

// Create a lock for a shared resource
const resourceLock = new Lock();

// Execute a function with exclusive access to the resource
async function accessSharedResource() {
  const result = await resourceLock.execute(async () => {
    // This code will run with exclusive access to the resource
    const data = await fetchDataFromDatabase();
    const processedData = processData(data);
    await saveDataToDatabase(processedData);
    return processedData;
  });

  return result;
}

// Alternatively, you can manually acquire and release the lock
async function manualLockHandling() {
  await resourceLock.acquire();
  try {
    // Critical section with exclusive access
    const data = await fetchDataFromDatabase();
    const processedData = processData(data);
    await saveDataToDatabase(processedData);
    return processedData;
  } finally {
    // Always release the lock, even if an error occurs
    resourceLock.release();
  }
}
```


## Coding Principles

- group similar functionality in folders (analog to namespaces but without any namespace declaration)
- one class per file;
- one interface per file (unless interface is just used as a type);
- group types as other interfaces in a types.ts file per folder;
- group constants or enums in a constants.ts file per folder;
- group decorators in a decorators.ts file per folder;
- always import from the specific file, never from a folder or index file (exceptions for dependencies on other packages);
- prefer the usage of established design patters where applicable:
  - Singleton (can be an anti-pattern. use with care);
  - factory;
  - observer;
  - strategy;
  - builder;
  - etc;


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
