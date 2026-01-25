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
