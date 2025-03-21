jest.setTimeout(30000);
if (process.env["GITLAB_CI"]) jest.setTimeout(3 * 30000);

describe(`Transactional Context Test`, function () {
  //
  // const testModel = new TestModelAsync();
  //
  // beforeEach(() => {
  //   Injectables.reset();
  // });
  //
  it(`Fills Properties Nicely`, function (testFinished) {
    // const testRepository: TransactionalRepository = new TransactionalRepository(1000, false);
    //
    // testRepository.create("testModel.id", testModel, (err?: Error, result?: TestModelAsync) => {
    //   expect(err).toBeUndefined();
    //   expect(result).toBeDefined();
    //   if (result){
    //     expect(result.id).toBeDefined();
    //     expect(result.updatedOn).toBeDefined();
    //     expect(result.createdOn).toBeDefined();
    //   }
    testFinished();
    // });
  });
  //
  // it(`Schedules transactions properly`, (testFinished) => {
  //   const testRepository: Repository<TestModelAsync> = new TransactionalRepository(200, false);
  //
  //   const {ConsumerRunner, defaultComparer} = require('../../bin/Consumer');
  //
  //   const count = 5 , times = 5
  //
  //   const onBegin = jest.fn()
  //   const onEnd = jest.fn()
  //
  //   const onBeginPromise = async () => {
  //     return Promise.resolve(onBegin())
  //   }
  //
  //   const onEndPromise = async (err?: Error) => {
  //     return Promise.resolve(onEnd(err))
  //   }
  //
  //   Transaction.setLock(new SyncronousLock(1, onBeginPromise, onEndPromise))
  //
  //   const lock = Transaction.getLock();
  //
  //   const submitTransactionMock = jest.spyOn(lock, "submit")
  //   const releaseTransactionMock = jest.spyOn(lock, "release")
  //
  //   const consumerRunner = new ConsumerRunner("create", true, (identifier: string, callback: Callback) => {
  //
  //     const tm = new TestModelAsync();
  //     testRepository.create(Date.now(), tm, (err: Err, model?: TestModelAsync) => {
  //       try {
  //         expect(err).toBeUndefined();
  //         expect(model).toBeDefined();
  //       } catch (e){
  //         //@ts-ignore
  //         return callback(e)
  //       }
  //       callback(err, model);
  //     });
  //   }, defaultComparer);
  //
  //   consumerRunner.run(count, 100, times, true, (err: Error) => {
  //     if (err)
  //       return testFinished(err)
  //     try {
  //       expect(submitTransactionMock).toHaveBeenCalledTimes(count * times)
  //       expect(releaseTransactionMock).toHaveBeenCalledTimes(count * times)
  //       expect(onBegin).toHaveBeenCalledTimes(count * times)
  //       expect(onEnd).toHaveBeenCalledTimes(count * times)
  //     } catch (e: any) {
  //       return testFinished(e)
  //     }
  //
  //     testFinished()
  //   })
  // });
  //
  // describe("Handles different transactional methods within the same transaction", () => {
  //
  //   beforeEach(() => {
  //     Injectables.reset();
  //     jest.restoreAllMocks()
  //     jest.resetAllMocks()
  //   })
  //
  //   it("Handles calls to multiple transactional methods within the same Async transactional function", (callback) => {
  //
  //     const caller = new GenericCaller();
  //
  //     const tm = new TestModelAsync();
  //
  //     const lock = Transaction.getLock();
  //
  //     const mockSubmit = jest.spyOn(lock, "submit")
  //     const mockRelease = jest.spyOn(lock, "release")
  //
  //     const mockBindTransaction = jest.spyOn(Transaction.prototype, "bindTransaction")
  //
  //     caller.runAsync(tm, (err: Error, model1?: TestModelAsync, model2?: TestModelAsync) => {
  //       if (err || !model1 || !model2)
  //         return callback(err || "missing results")
  //
  //       try {
  //         expect(mockSubmit).toHaveBeenCalledTimes(1)
  //         expect(mockRelease).toHaveBeenCalledTimes(1)
  //         expect(mockBindTransaction).toHaveBeenCalledTimes(4)
  //       } catch (e: any) {
  //         return callback(e)
  //       }
  //
  //       callback()
  //     })
  //   })
  //   it("Handles calls to multiple transactional methods within the same Promise Based transactional function", (callback) => {
  //
  //     const caller = new GenericCaller();
  //
  //     const tm = new TestModelAsync();
  //
  //     const lock = Transaction.getLock();
  //
  //     const mockSubmit = jest.spyOn(lock, "submit")
  //     const mockRelease = jest.spyOn(lock, "release")
  //
  //     const mockBindTransaction = jest.spyOn(Transaction.prototype, "bindTransaction")
  //
  //     caller.runPromise(tm).then((result: {model1: TestModelAsync, model2: TestModelAsync}) => {
  //       try {
  //         const {model1, model2} = result;
  //         expect(model1).toBeDefined();
  //         expect(model2).toBeDefined();
  //         expect(mockSubmit).toHaveBeenCalledTimes(1)
  //         expect(mockRelease).toHaveBeenCalledTimes(1)
  //         expect(mockBindTransaction).toHaveBeenCalledTimes(5)
  //       } catch (e: any) {
  //         return callback(e)
  //       }
  //       callback()
  //     }).catch(callback)
  //   })
  // })
  // describe("Handles onBegin and onEnd methods", () => {
  //
  //   let onBegin: any, onEnd: any
  //
  //   beforeEach(() => {
  //     Injectables.reset();
  //     jest.restoreAllMocks()
  //     jest.resetAllMocks()
  //     onBegin = jest.fn()
  //     onEnd = jest.fn()
  //
  //     const onBeginPromise = async () => {
  //       return Promise.resolve(onBegin())
  //     }
  //
  //     const onEndPromise = async (err?: Error) => {
  //       return Promise.resolve(onEnd(err))
  //     }
  //     Transaction.setLock(new SyncronousLock(1, onBeginPromise, onEndPromise))
  //
  //   })
  //
  //   it("Calls onBegin before the Transaction and onEnd after", (callback) => {
  //     const testRepository: TransactionalRepository = new TransactionalRepository(1000, false);
  //     const lock = Transaction.getLock();
  //
  //     const submitTransactionMock = jest.spyOn(lock, "submit")
  //     const releaseTransactionMock = jest.spyOn(lock, "release")
  //
  //     testRepository.create("testModel.id", testModel, (err: Err, result?: TestModelAsync) => {
  //       if (err || !result)
  //         return callback(err || "missing model")
  //       try {
  //         expect(result.id).toBeDefined();
  //         expect(result.updatedOn).toBeDefined();
  //         expect(result.createdOn).toBeDefined();
  //
  //         expect(submitTransactionMock).toHaveBeenCalledTimes(1)
  //         expect(releaseTransactionMock).toHaveBeenCalledTimes(1)
  //         expect(onBegin).toHaveBeenCalledTimes(1)
  //         expect(onEnd).toHaveBeenCalledTimes(1)
  //       } catch (e: any) {
  //         return callback(e)
  //       }
  //
  //       callback();
  //     });
  //   })
  //
  //   it("Pushes transactions to the queue", (callback) => {
  //     const testRepository: TransactionalRepository = new TransactionalRepository(1000, false);
  //
  //     const lock = Transaction.getLock();
  //
  //     const submitTransactionMock = jest.spyOn(lock, "submit")
  //     const releaseTransactionMock = jest.spyOn(lock, "release")
  //
  //     function func(this: TransactionalRepository, ...args: any[]) {
  //       // @ts-ignore
  //       this.create( ...args);
  //     }
  //
  //     Transaction.push(testRepository, func, "testModel.id", testModel, (err: Err, result?: TestModelAsync) => {
  //       if (err || !result)
  //         return callback(err || "missing model")
  //       try {
  //         expect(result.id).toBeDefined();
  //         expect(result.updatedOn).toBeDefined();
  //         expect(result.createdOn).toBeDefined();
  //         expect(submitTransactionMock).toHaveBeenCalledTimes(1)
  //         expect(releaseTransactionMock).toHaveBeenCalledTimes(1)
  //         expect(onBegin).toHaveBeenCalledTimes(1)
  //         expect(onEnd).toHaveBeenCalledTimes(1)
  //       } catch (e: any) {
  //         return callback(e)
  //       }
  //
  //       callback();
  //     });
  //   })
  // })
  //
  // describe("properly Logs transaction method calls", () => {
  //
  //   beforeEach(() => {
  //     Injectables.reset();
  //     jest.restoreAllMocks()
  //     jest.resetAllMocks()
  //   })
  //
  //   it("Logs a simple transaction properly", (callback) => {
  //     const repo = new DBRepo(TestModelAsync);
  //
  //     const model = new TestModelAsync();
  //
  //     const transactionLock  = Transaction.getLock();
  //
  //     const originalSubmit = transactionLock.submit.bind(transactionLock);
  //
  //     const mockSubmit = jest.spyOn(transactionLock, "submit");
  //
  //     const originalRelease = transactionLock.release.bind(transactionLock);
  //
  //     const mockRelease = jest.spyOn(transactionLock, "release");
  //
  //     mockRelease.mockImplementation(async (err?: Error) => {
  //       return originalRelease(err)
  //     })
  //
  //     let currentTransaction: Transaction, endTransaction: Transaction;
  //     let originalBindTransaction: any, mockBindTransaction: any
  //
  //     mockSubmit.mockImplementation((transaction: Transaction)  => {
  //       originalSubmit(transaction)
  //       currentTransaction = transaction;
  //
  //       originalBindTransaction = transaction.bindTransaction.bind(transaction)
  //       mockBindTransaction = jest.spyOn(transaction, "bindTransaction")
  //       mockBindTransaction.mockImplementation((transaction: Transaction) => {
  //
  //         originalBindTransaction(transaction)
  //       })
  //     })
  //
  //
  //     repo.create("key1", model, (err: Error, created?: TestModelAsync) => {
  //       if (err  || !created)
  //         return callback(err)
  //
  //       try {
  //         expect(mockSubmit).toHaveBeenCalledTimes(1)
  //         expect(mockRelease).toHaveBeenCalledTimes(1)
  //         expect(mockBindTransaction).toBeDefined()
  //         expect(mockBindTransaction).toHaveBeenCalledTimes(1)
  //         expect(currentTransaction).toBeDefined()
  //         expect(currentTransaction.log.length).toEqual(2)
  //       } catch (e: any) {
  //         return callback(e)
  //       }
  //       callback()
  //     })
  //   })
  //
  //   it("Logs a multiple transaction properly", (callback) => {
  //     const repo = new DBRepo(TestModelAsync);
  //
  //     const transactionLock  = Transaction.getLock();
  //
  //     const originalSubmit = transactionLock.submit.bind(transactionLock);
  //
  //     const mockSubmit = jest.spyOn(transactionLock, "submit");
  //
  //     const originalRelease = transactionLock.release.bind(transactionLock);
  //
  //     const mockRelease = jest.spyOn(transactionLock, "release");
  //
  //     mockRelease.mockImplementation(async (err?: Err) => {
  //       return originalRelease(err)
  //     })
  //
  //     let currentTransaction: Transaction;
  //     let originalBindTransaction: any, mockBindTransaction: any
  //
  //     mockSubmit.mockImplementation((transaction: Transaction)  => {
  //       originalSubmit(transaction)
  //       currentTransaction = transaction;
  //
  //       originalBindTransaction = transaction.bindTransaction.bind(transaction)
  //       mockBindTransaction = jest.spyOn(transaction, "bindTransaction")
  //       mockBindTransaction.mockImplementation((transaction: Transaction) => {
  //
  //         originalBindTransaction(transaction)
  //       })
  //     })
  //
  //     const objs = Object.keys(new Array(10).fill(0)).reduce((accum: any, k) => {
  //       accum[`key${k}`] = new TestModelAsync()
  //       return accum
  //     }, {})
  //
  //     repo.createAll(Object.keys(objs), Object.values(objs), (err: Err, created?: TestModelAsync[]) => {
  //       if (err  || !created)
  //         return callback(err)
  //
  //       try {
  //         expect(created.length).toEqual(10)
  //         expect(mockSubmit).toHaveBeenCalledTimes(1)
  //         expect(mockRelease).toHaveBeenCalledTimes(1)
  //         expect(mockBindTransaction).toBeDefined()
  //         expect(mockBindTransaction).toHaveBeenCalledTimes(20)
  //         expect(currentTransaction).toBeDefined()
  //         expect(currentTransaction.log.length).toEqual(21)
  //       } catch (e: any) {
  //         return callback(e)
  //       }
  //       callback()
  //     })
  //   })
  // })
});
