### Transactions

The repository presents a solution to syncronize transactions, which is especially useful in situations where concurrency is not handled well.

#### Used Decorators
 - Class Decorators
   - `@injectable`: Tags the class as an injectable (available via `@inject`) as as a singleton;
   - `@Transactional`: Tags the class as one containing transactional methods
   - `@repository`: Tags the class as a combination of the 2 previous ones
 - Method decorators
   - `@transactional`: Tags the method as transactional. Receives one `type` argument that singnal if the function is sync, callback or promise based. defaults to callback based.

#### How it works

When a method is decorated as `@transactional` 2 of 3 things will happen:
 - If it's the first `@transactional` method in the transaction:
   - a new transaction will be created and submitted to the transaction loop;
 - If not, the method call will be attached to the same transaction and executed;
 - the transactional method will be called using a proxy object as `this`. This proxy will have all it;s transactions methods proxied to pass along the transaction, as well as have all its `@Transactional` decorated properties proxies in the same manner. This ensures all method calls for the duration of the method are always bound to the same transaction;

#### How to use

Bellow are 2 class definitions. One abstract class, and one concrete implementation of that child class.

```ts
import {FunctionType, transactional, transactionalSuperCall} from "./transactions";
import {Transactional} from "./decorators";

export abstract class ClassWithTransactionalMethods {

   @transactional()
   transactionalMethodWithCallback(...args: (any | Callback)[]) {
      const callback: Callback = args.pop();
   ...
      callback(...results)
   }

   @transactional(FunctionType.PROMISE)
   async transactionalMethodPromise(...args: any) {
      return new Promise<any>((resolve, reject) => {
         resolve()
      })
   }

   nonTransactionalMethodWithCallback(...args: (any | Callback)[]) {
      const callback: Callback = args.pop();
   ...
      callback(...results)
   }
}

@repository("ChildClassWithTransactionalMethods")
export class ChildClassWithTransactionalMethods {

   @transactional()
   transactionalMethodWithCallback(...args: (any | Callback)[]) {
      transactionalSuperCall(super.transactionalMethodWithCallback.bind(this), ...args)
   }

   @transactional(FunctionType.PROMISE)
   async transactionalMethodPromise(...args: any) {
      return new Promise<any>((resolve, reject) => {
         transactionalSuperCall(super.transactionalMethodPromise.bind(this), ...args)
                 .then(resolve)
                 .catch(reject)
      })
   }

   @transactional()
   nonTransactionalMethodWithCallback(...args: (any | Callback)[]) {
      super.nonTransactionalMethodWithCallback(...args)
   }
}
```

Notice that the base class has 3 methods:
 - `transactionalMethodWithCallback`: Transactional method (callback based)
 - `transactionalMethodPromise`: Transactional Method (Promise based)
 - `nonTransactionalMethodWithCallback`: Non transactional method (callback based)

Also notice that the base class as no class Decorators, unlike the child class.

This means that this class, unless is has its methods overridden, will have 2 transactional methods.

Looking at the child class, all 3 methods are decorated as transactional:
 - `transactionalMethodWithCallback`: Transactional method (Callback based) that overrides the original Transactional method
 - `transactionalMethodPromise`: Transactional method (Promise based) that overrides the original Transactional method
 - `nonTransactionalMethodWithCallback`: Transactional method (Callback based) that overrides the original NON Transactional method

Please note that when you override an existing transactional method, if we need to call the super, then that call must be wrapped with the `transactionalSuperCall` method

When you are overriding (and decorating as transactional) a non transactional method, then a normal super call can be used;

Also notice how only the concrete class has the `@repository` class decorator, that allows it to be proxied when it's a property of another class (because it also sets the class as `@Transactional`. Only the `@Transactional` could be used, but we need the injectable feature for the next example;

Now consider the following scenario:

```typescript
import {Callback} from "@decaf-ts/logging";
import {transactional} from "./transactions";
import {Transactional} from "./decorators";

@Transactional()
export class CompoundTransaction {

   @inject("ChildClassWithTransactionalMethods")
   repo1!: ChildClassWithTransactionalMethods

   @inject("OtherClassWithTransactionalMethods")
   repo2!: OtherClassWithTransactionalMethods

   @transactional()
   execute(arg1: any, arg2: any, callback: Callback) {
     const self = this;
     self.repo1.create(arg1, (err, result1) => {
         if (err)
             return callback(err)
        self.repo2.create(arg2, (err, result2) => {
            if (err)
                return callback(err)
           callback(undefined, result1, result2)
        })
     })
   }
}
```

in this scenario, when the `execute` method is called, a new transaction will be opened, and the calls to the repo1 and repo2 `create` will be appended to the transaction automatically. Notice both repos will need to be decorated as `@Transactional` for this to work.

Finally, for the last scenario:

```typescript
import {Callback} from "@decaf-ts/logging";
import {Transaction, transactional} from "./transactions";
import {Transactional} from "./decorators";

export class CompoundTransaction {

   @inject("ChildClassWithTransactionalMethods")
   repo1!: ChildClassWithTransactionalMethods

   @inject("OtherClassWithTransactionalMethods")
   repo2!: OtherClassWithTransactionalMethods
   
   execute(arg1: any, arg2: any, callback: Callback) {
      const self = this;  
       
      function transactionRunner(this: CompoundTransaction, ...args: any[]){
          const callback: Callback = args.pop()
          self.repo1.create(arg1, (err, result1) => {
             if (err)
                return callback(err)
             self.create(arg2, (err, result2) => {
                if (err)
                   return callback(err)
                callback(undefined, result1, result2)
             });
          })
      }

      // (...long running code)

      Transaction.push(self, transactionRunner, arg1, arg2, (err, result1, result2) => {
         if (err)
            return callback(err)
         
         // (...or long running code) 

         callback(undefined, result1, result2)
      })
   }
}
```

in this final example, it may not be desirable to tag an entire method as `@transactional`.
Maybe parts of the method take too long, or you only want to lock a certain part of the method, ensure the transctions as as small as possible.

In this case you can use the `Transaction.push` method, passing it a `transactionRunner` function. This will push that transaction the the transaction loop and return it as soon as its concluded

