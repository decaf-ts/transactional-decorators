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
Transaction.submit(transaction);

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
