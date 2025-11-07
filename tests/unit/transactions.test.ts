import { TestModelAsync } from "./TestModel";
import { Injectables } from "@decaf-ts/injectable-decorators";
import { DBRepo, GenericCaller, TransactionalRepository } from "./repositories";
import { Repository } from "@decaf-ts/db-decorators";
import { SynchronousLock, Transaction } from "../../src";
import {
  ConsumerRunner,
  defaultComparer,
} from "../../node_modules/@decaf-ts/utils/lib/tests/Consumer.cjs";
import { Logging, LogLevel } from "@decaf-ts/logging";

const DEFAULT_TIMEOUT = 15000;
jest.setTimeout(DEFAULT_TIMEOUT);
if (process.env["GITLAB_CI"]) jest.setTimeout(3 * DEFAULT_TIMEOUT);

Logging.setConfig({ level: LogLevel.silly });

describe(`Transactional Context Test`, function () {
  const testModel = new TestModelAsync({
    id: "" + Date.now(),
    name: "Test Name",
    address: "123 Test Street",
  });

  beforeEach(() => {
    Injectables.reset();
  });

  it(`Fills Properties Nicely`, async () => {
    const testRepository: TransactionalRepository = new TransactionalRepository(
      1000,
      false
    );

    const result = await testRepository.create(testModel);
    expect(result).toBeDefined();
    if (result) {
      expect(result.id).toBeDefined();
      expect(result.updatedOn).toBeDefined();
      expect(result.createdOn).toBeDefined();
    }
  });

  it(`Schedules transactions properly`, async () => {
    const testRepository: Repository<TestModelAsync> =
      new TransactionalRepository(200, false);

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
      async (identifier: number) => {
        const tm = new TestModelAsync({
          id: "" + identifier,
        });
        const created = await testRepository.create(tm);
        expect(created).toBeDefined();
        return created;
      },
      defaultComparer
    );

    await consumerRunner.run(count, 100, times, true);
    expect(submitTransactionMock).toHaveBeenCalledTimes(count * times);
    expect(releaseTransactionMock).toHaveBeenCalledTimes(count * times);
    expect(onBegin).toHaveBeenCalledTimes(count * times);
    expect(onEnd).toHaveBeenCalledTimes(count * times);
  });

  describe("Handles different transactional methods within the same transaction", () => {
    beforeEach(() => {
      Injectables.reset();
      jest.restoreAllMocks();
      jest.resetAllMocks();
    });

    it("Handles calls to multiple transactional methods within the same transactional function", async () => {
      const caller = new GenericCaller();

      const tm = new TestModelAsync({
        id: "" + Date.now(),
      });

      const lock = Transaction.getLock();

      const mockSubmit = jest.spyOn(lock, "submit");
      const mockRelease = jest.spyOn(lock, "release");

      const mockBindTransaction = jest.spyOn(
        Transaction.prototype,
        "bindTransaction"
      );

      const result = await caller.runPromise(tm);

      const { created1, created2 } = result;
      expect(created1).toBeDefined();
      expect(created2).toBeDefined();
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockRelease).toHaveBeenCalledTimes(1);
      expect(mockBindTransaction).toHaveBeenCalledTimes(4);
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

    it("Pushes transactions to the queue", async () => {
      const testRepository: TransactionalRepository =
        new TransactionalRepository(1000, false);

      const lock = Transaction.getLock();

      const submitTransactionMock = jest.spyOn(lock, "submit");
      const releaseTransactionMock = jest.spyOn(lock, "release");

      function func(this: TransactionalRepository, ...args: any[]) {
        // @ts-expect-error teasting
        return this.create(...args);
      }

      const result = await Transaction.push(testRepository, func, testModel);

      expect(result.id).toBeDefined();
      expect(result.updatedOn).toBeDefined();
      expect(result.createdOn).toBeDefined();
      expect(submitTransactionMock).toHaveBeenCalledTimes(1);
      expect(releaseTransactionMock).toHaveBeenCalledTimes(1);
      expect(onBegin).toHaveBeenCalledTimes(1);
      expect(onEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe("awaitable transaction APIs", () => {
    beforeEach(() => {
      Transaction.setLock(new SynchronousLock());
    });

    it("allows awaiting Transaction.submit for the transaction result", async () => {
      const transaction = new Transaction("TestSource", "submit", async () => {
        await Transaction.release();
        return "submit-result";
      });

      await expect(Transaction.submit(transaction)).resolves.toBe(
        "submit-result"
      );
    });

    it("returns the latest bound action result when awaiting fire", async () => {
      const transaction = new Transaction("TestSource", "initial", async () => {
        return "initial";
      });
      const next = new Transaction("TestSource", "next", async () => {
        return "next-result";
      });

      transaction.bindTransaction(next);
      await expect(transaction.fire()).resolves.toBe("next-result");
    });

    it("propagates results when awaiting the lock submit directly", async () => {
      const lock = new SynchronousLock();
      Transaction.setLock(lock);
      const transaction = new Transaction("TestSource", "lockSubmit", async () => {
        await Transaction.release();
        return 42;
      });

      await expect(lock.submit(transaction)).resolves.toBe(42);
    });
  });

  describe.skip("properly Logs transaction method calls", () => {
    beforeEach(() => {
      Injectables.reset();
      jest.restoreAllMocks();
      jest.resetAllMocks();
    });

    it("Logs a simple transaction properly", async () => {
      const repo = new DBRepo(TestModelAsync);

      const model = new TestModelAsync({
        id: "" + Date.now(),
      });

      const transactionLock = Transaction.getLock();

      const originalSubmit = transactionLock.submit.bind(transactionLock);

      const mockSubmit = jest.spyOn(transactionLock, "submit");

      const originalRelease = transactionLock.release.bind(transactionLock);

      const mockRelease = jest.spyOn(transactionLock, "release");

      mockRelease.mockImplementation(async (err?: Error) => {
        return originalRelease(err);
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let currentTransaction: Transaction, endTransaction: Transaction;
      let originalBindTransaction: any, mockBindTransaction: any;

      mockSubmit.mockImplementation((transaction: Transaction) => {
        const submission = originalSubmit(transaction);
        currentTransaction = transaction;

        originalBindTransaction = transaction.bindTransaction.bind(transaction);
        mockBindTransaction = jest.spyOn(transaction, "bindTransaction");
        mockBindTransaction.mockImplementation((transaction: Transaction) => {
          originalBindTransaction(transaction);
        });
        return submission;
      });

      const created = await repo.create(model);
      expect(created).toBeDefined();
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockRelease).toHaveBeenCalledTimes(1);
      expect(mockBindTransaction).toBeDefined();
      expect(mockBindTransaction).toHaveBeenCalledTimes(1);
      expect(currentTransaction).toBeDefined();
      expect(currentTransaction.logs.length).toEqual(2);
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
        const submission = originalSubmit(transaction);
        currentTransaction = transaction;

        originalBindTransaction = transaction.bindTransaction.bind(transaction);
        mockBindTransaction = jest.spyOn(transaction, "bindTransaction");
        mockBindTransaction.mockImplementation((transaction: Transaction) => {
          originalBindTransaction(transaction);
        });
        return submission;
      });

      const objs = Object.keys(new Array(10).fill(0)).map((k) => {
        return new TestModelAsync({
          id: `key${k}`,
        });
      });

      const created = await repo.createAll(objs);
      expect(created.length).toEqual(10);
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockRelease).toHaveBeenCalledTimes(1);
      expect(mockBindTransaction).toBeDefined();
      expect(mockBindTransaction).toHaveBeenCalledTimes(20);
      expect(currentTransaction).toBeDefined();
      expect(currentTransaction.logs.length).toEqual(21);
    });
  });
});
