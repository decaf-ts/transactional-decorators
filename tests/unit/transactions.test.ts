import { DBRepo, TransactionalRepository } from "./repositories";
import { TestModelAsync } from "./TestModel";
import { Injectables } from "@decaf-ts/injectable-decorators";
import { Callback, Transaction } from "../../src";
import { SynchronousLock } from "../../src";
import { Repository } from "@decaf-ts/db-decorators";
import { GenericCaller } from "./GenericCaller";

jest.setTimeout(30000);
if (process.env["GITLAB_CI"]) jest.setTimeout(3 * 30000);

describe(`Transactional Context Test`, function () {
  const testModel = new TestModelAsync();

  beforeEach(() => {
    Injectables.reset();
  });

  it(`Fills Properties Nicely`, async () => {
    const repo: TransactionalRepository = new TransactionalRepository(
      1000,
      false
    );

    const created = await repo.create(
      new TestModelAsync({
        id: "testModel.id",
        name: "testModel.name",
        description: "testModel.description",
      })
    );

    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.updatedOn).toBeDefined();
    expect(created.createdOn).toBeDefined();
  });

  it.skip(`Schedules transactions properly`, (testFinished) => {
    const testRepository: Repository<TestModelAsync> =
      new TransactionalRepository(200, false);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ConsumerRunner, defaultComparer } = require("../../bin/Consumer");

    const count = 5,
      times = 5;

    const onBegin = jest.fn();
    const onEnd = jest.fn();

    const onBeginPromise = async () => {
      return Promise.resolve(onBegin());
    };

    const onEndPromise = async (err?: Error) => {
      return Promise.resolve(onEnd(err));
    };

    Transaction.setLock(new SynchronousLock(1, onBeginPromise, onEndPromise));

    const lock = Transaction.getLock();

    const submitTransactionMock = jest.spyOn(lock, "submit");
    const releaseTransactionMock = jest.spyOn(lock, "release");

    const consumerRunner = new ConsumerRunner(
      "create",
      true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (identifier: string, callback: Callback) => {
        const tm = new TestModelAsync();
        const created = await testRepository.create(tm);
        expect(created).toBeDefined();
      },
      defaultComparer
    );

    consumerRunner.run(count, 100, times, true, (err: Error) => {
      if (err) return testFinished(err);
      try {
        expect(submitTransactionMock).toHaveBeenCalledTimes(count * times);
        expect(releaseTransactionMock).toHaveBeenCalledTimes(count * times);
        expect(onBegin).toHaveBeenCalledTimes(count * times);
        expect(onEnd).toHaveBeenCalledTimes(count * times);
      } catch (e: any) {
        return testFinished(e);
      }

      testFinished();
    });
  });

  describe("Handles different transactional methods within the same transaction", () => {
    beforeEach(() => {
      Injectables.reset();
      jest.restoreAllMocks();
      jest.resetAllMocks();
    });

    it("Handles calls to multiple transactional methods within the same Async transactional function", async () => {
      const caller = new GenericCaller();

      const tm = new TestModelAsync();

      const lock = Transaction.getLock();

      const mockSubmit = jest.spyOn(lock, "submit");
      const mockRelease = jest.spyOn(lock, "release");

      const mockBindTransaction = jest.spyOn(
        Transaction.prototype,
        "bindTransaction"
      );

      const { model1, model2 } = await caller.run(tm);

      expect(model1).toBeDefined();
      expect(model2).toBeDefined();
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockRelease).toHaveBeenCalledTimes(1);
      expect(mockBindTransaction).toHaveBeenCalledTimes(4);
    });
    it("Handles calls to multiple transactional methods within the same Promise Based transactional function", async () => {
      const caller = new GenericCaller();

      const tm = new TestModelAsync();

      const lock = Transaction.getLock();

      const mockSubmit = jest.spyOn(lock, "submit");
      const mockRelease = jest.spyOn(lock, "release");

      const mockBindTransaction = jest.spyOn(
        Transaction.prototype,
        "bindTransaction"
      );

      const { model1, model2 } = await caller.run(tm);

      expect(model1).toBeDefined();
      expect(model2).toBeDefined();
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockRelease).toHaveBeenCalledTimes(1);
      expect(mockBindTransaction).toHaveBeenCalledTimes(5);
    });
  });
  describe("Handles onBegin and onEnd methods", () => {
    let onBegin: any, onEnd: any;

    beforeEach(() => {
      Injectables.reset();
      jest.restoreAllMocks();
      jest.resetAllMocks();
      onBegin = jest.fn();
      onEnd = jest.fn();

      const onBeginPromise = async () => {
        return Promise.resolve(onBegin());
      };

      const onEndPromise = async (err?: Error) => {
        return Promise.resolve(onEnd(err));
      };
      Transaction.setLock(new SynchronousLock(1, onBeginPromise, onEndPromise));
    });

    it("Calls onBegin before the Transaction and onEnd after", async () => {
      const testRepository: TransactionalRepository =
        new TransactionalRepository(1000, false);
      const lock = Transaction.getLock();

      const submitTransactionMock = jest.spyOn(lock, "submit");
      const releaseTransactionMock = jest.spyOn(lock, "release");

      const result = await testRepository.create(testModel);

      expect(result.id).toBeDefined();
      expect(result.updatedOn).toBeDefined();
      expect(result.createdOn).toBeDefined();

      expect(submitTransactionMock).toHaveBeenCalledTimes(1);
      expect(releaseTransactionMock).toHaveBeenCalledTimes(1);
      expect(onBegin).toHaveBeenCalledTimes(1);
      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it("Pushes transactions to the queue", (callback) => {
      const testRepository: TransactionalRepository =
        new TransactionalRepository(1000, false);

      const lock = Transaction.getLock();

      const submitTransactionMock = jest.spyOn(lock, "submit");
      const releaseTransactionMock = jest.spyOn(lock, "release");

      function func(this: TransactionalRepository, ...args: any[]) {
        // @ts-expect-error varargs
        this.create(...args);
      }

      Transaction.push(
        testRepository,
        func,
        "testModel.id",
        testModel,
        (err?: any, result?: TestModelAsync) => {
          if (err || !result) return callback(err || "missing model");
          try {
            expect(result.id).toBeDefined();
            expect(result.updatedOn).toBeDefined();
            expect(result.createdOn).toBeDefined();
            expect(submitTransactionMock).toHaveBeenCalledTimes(1);
            expect(releaseTransactionMock).toHaveBeenCalledTimes(1);
            expect(onBegin).toHaveBeenCalledTimes(1);
            expect(onEnd).toHaveBeenCalledTimes(1);
          } catch (e: any) {
            return callback(e);
          }

          callback();
        }
      );
    });
  });

  describe("properly Logs transaction method calls", () => {
    beforeEach(() => {
      Injectables.reset();
      jest.restoreAllMocks();
      jest.resetAllMocks();
    });

    it("Logs a simple transaction properly", async () => {
      const repo = new DBRepo(TestModelAsync);

      const model = new TestModelAsync();

      const transactionLock = Transaction.getLock();

      const originalSubmit = transactionLock.submit.bind(transactionLock);

      const mockSubmit = jest.spyOn(transactionLock, "submit");

      const originalRelease = transactionLock.release.bind(transactionLock);

      const mockRelease = jest.spyOn(transactionLock, "release");

      mockRelease.mockImplementation(async (err?: Error) => {
        return originalRelease(err);
      });

      let currentTransaction: Transaction, endTransaction: Transaction;
      let originalBindTransaction: any, mockBindTransaction: any;

      mockSubmit.mockImplementation((transaction: Transaction) => {
        originalSubmit(transaction);
        currentTransaction = transaction;

        originalBindTransaction = transaction.bindTransaction.bind(transaction);
        mockBindTransaction = jest.spyOn(transaction, "bindTransaction");
        mockBindTransaction.mockImplementation((transaction: Transaction) => {
          originalBindTransaction(transaction);
        });
      });

      const created = await repo.create(
        new TestModelAsync({
          id: "key1",
        })
      );
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockRelease).toHaveBeenCalledTimes(1);
      expect(mockBindTransaction).toBeDefined();
      expect(mockBindTransaction).toHaveBeenCalledTimes(1);
      expect(currentTransaction).toBeDefined();
      expect(currentTransaction.log.length).toEqual(2);
    });

    it("Logs a multiple transaction properly", async () => {
      const repo = new DBRepo(TestModelAsync);

      const transactionLock = Transaction.getLock();

      const originalSubmit = transactionLock.submit.bind(transactionLock);

      const mockSubmit = jest.spyOn(transactionLock, "submit");

      const originalRelease = transactionLock.release.bind(transactionLock);

      const mockRelease = jest.spyOn(transactionLock, "release");

      mockRelease.mockImplementation(async (err?: Error) => {
        return originalRelease(err);
      });

      let currentTransaction: Transaction;
      let originalBindTransaction: any, mockBindTransaction: any;

      mockSubmit.mockImplementation((transaction: Transaction) => {
        originalSubmit(transaction);
        currentTransaction = transaction;

        originalBindTransaction = transaction.bindTransaction.bind(transaction);
        mockBindTransaction = jest.spyOn(transaction, "bindTransaction");
        mockBindTransaction.mockImplementation((transaction: Transaction) => {
          originalBindTransaction(transaction);
        });
      });

      const objs = Object.keys(new Array(10).fill(0)).reduce(
        (accum: any, k, i) => {
          accum[`key${k}`] = new TestModelAsync({
            id: "id" + i,
          });
          return accum;
        },
        {}
      );

      const created = await repo.createAll(Object.values(objs));
      expect(created.length).toEqual(10);
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockRelease).toHaveBeenCalledTimes(1);
      expect(mockBindTransaction).toBeDefined();
      expect(mockBindTransaction).toHaveBeenCalledTimes(20);
      expect(currentTransaction).toBeDefined();
      expect(currentTransaction.log.length).toEqual(21);
    });
  });
});
