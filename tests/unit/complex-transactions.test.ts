import { TestModelAsync } from "./TestModel";
import { Injectables } from "@decaf-ts/injectable-decorators";
import { GenericCaller, GenericCaller2, GenericCaller3 } from "./repositories";
import { SynchronousLock, Transaction } from "../../src";
import {
  ConsumerRunner,
  defaultComparer,
} from "../../node_modules/@decaf-ts/utils/lib/tests/Consumer.cjs";
import { Logging, LogLevel } from "@decaf-ts/logging";

const DEFAULT_TIMEOUT = 15000;
jest.setTimeout(DEFAULT_TIMEOUT);
if (process.env["GITLAB_CI"]) jest.setTimeout(3 * DEFAULT_TIMEOUT);

Transaction.debug = true;
Logging.setConfig({ level: LogLevel.silly });

describe(`Complex Transactional Context Test`, function () {
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

  it.skip("Calls with simple nested objects onBegin before the Transaction and onEnd after", async () => {
    const caller = new GenericCaller();
    const count = 5,
      times = 5;

    const lock = Transaction.getLock();

    const mockSubmit = jest.spyOn(lock, "submit");
    const mockRelease = jest.spyOn(lock, "release");

    const mockBindTransaction = jest.spyOn(
      Transaction.prototype,
      "bindTransaction"
    );

    const consumerRunner = new ConsumerRunner(
      "create",
      async (identifier: number) => {
        const tm = new TestModelAsync({
          id: "" + identifier,
        });
        const result = await caller.runPromise(tm);

        const { created1, created2 } = result;
        expect(created1).toBeDefined();
        expect(created2).toBeDefined();
        return result;
      },
      defaultComparer
    );
    const result = await consumerRunner.run(count, 100, times, true);
    expect(result).toBeDefined();
    expect(mockSubmit).toHaveBeenCalledTimes(times * count);
    expect(mockRelease).toHaveBeenCalledTimes(times * count);
    expect(mockBindTransaction).toHaveBeenCalledTimes(times * count * 4);
    expect(onBegin).toHaveBeenCalledTimes(times * count);
    expect(onEnd).toHaveBeenCalledTimes(times * count);
  });

  it("Calls directly with nested objects onBegin before the Transaction and onEnd after", async () => {
    const caller = new GenericCaller();

    const lock = Transaction.getLock();

    const mockSubmit = jest.spyOn(lock, "submit");
    const mockRelease = jest.spyOn(lock, "release");

    const mockBindTransaction = jest.spyOn(
      Transaction.prototype,
      "bindTransaction"
    );

    const tm = new TestModelAsync({
      id: "" + Date.now(),
    });
    const result = await caller.runPromise(tm);

    const { created1, created2 } = result;
    expect(created1).toBeDefined();
    expect(created2).toBeDefined();

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(mockBindTransaction).toHaveBeenCalledTimes(1 * 4);
    expect(onBegin).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("Calls directly with nested objects onBegin before the Transaction and onEnd after", async () => {
    const caller = new GenericCaller3();

    const lock = Transaction.getLock();

    const mockSubmit = jest.spyOn(lock, "submit");
    const mockRelease = jest.spyOn(lock, "release");

    const mockBindTransaction = jest.spyOn(
      Transaction.prototype,
      "bindTransaction"
    );

    const tm = new TestModelAsync({
      id: "" + Date.now(),
    });
    const result = await caller.runPromise(tm);

    const { created1, created2 } = result;
    expect(created1).toBeDefined();
    expect(created2).toBeDefined();

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(mockBindTransaction).toHaveBeenCalledTimes(1 * 4);
    expect(onBegin).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("Calls with nested objects onBegin before the Transaction and onEnd after", async () => {
    const caller = new GenericCaller3();
    const count = 5,
      times = 5;

    const lock = Transaction.getLock();

    const mockSubmit = jest.spyOn(lock, "submit");
    const mockRelease = jest.spyOn(lock, "release");

    const mockBindTransaction = jest.spyOn(
      Transaction.prototype,
      "bindTransaction"
    );

    const consumerRunner = new ConsumerRunner(
      "create",
      async (identifier: number) => {
        const tm = new TestModelAsync({
          id: "" + identifier,
        });
        const result = await caller.runPromise(tm);

        const { created1, created2 } = result;
        expect(created1).toBeDefined();
        expect(created2).toBeDefined();
        return result;
      },
      defaultComparer
    );
    const result = await consumerRunner.run(count, 100, times, true);
    expect(result).toBeDefined();
    expect(mockSubmit).toHaveBeenCalledTimes(times * count);
    expect(mockRelease).toHaveBeenCalledTimes(times * count);
    expect(mockBindTransaction).toHaveBeenCalledTimes(times * count * 4);
    expect(onBegin).toHaveBeenCalledTimes(times * count);
    expect(onEnd).toHaveBeenCalledTimes(times * count);
  });

  it.skip("Calls with complex nested objects onBegin before the Transaction and onEnd after", async () => {
    const caller = new GenericCaller2();
    const count = 5,
      times = 5;

    const lock = Transaction.getLock();

    const mockSubmit = jest.spyOn(lock, "submit");
    const mockRelease = jest.spyOn(lock, "release");

    const mockBindTransaction = jest.spyOn(
      Transaction.prototype,
      "bindTransaction"
    );

    const consumerRunner = new ConsumerRunner(
      "create",
      async (identifier: number) => {
        const tm = new TestModelAsync({
          id: "" + identifier,
        });
        const result = await caller.runPromise(tm);

        const { created1, created2 } = result;
        expect(created1).toBeDefined();
        expect(created2).toBeDefined();
        return result;
      },
      defaultComparer
    );
    const result = await consumerRunner.run(count, 100, times, true);
    expect(result).toBeDefined();
    expect(mockSubmit).toHaveBeenCalledTimes(times * count);
    expect(mockRelease).toHaveBeenCalledTimes(times * count);
    expect(mockBindTransaction).toHaveBeenCalledTimes(times * count * 4);
    expect(onBegin).toHaveBeenCalledTimes(times * count);
    expect(onEnd).toHaveBeenCalledTimes(times * count);
  });
});
