import { MultiLock } from "../../src/locks/MultiLock";

describe("MultiLock", () => {
  let multiLock: MultiLock;

  beforeEach(() => {
    multiLock = new MultiLock();
  });

  it("should create and manage independent locks", async () => {
    const log: string[] = [];

    const task = async (name: string, delay: number) => {
      await multiLock.execute(async () => {
        log.push(`${name} started`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        log.push(`${name} finished`);
      }, name);
    };

    // Run tasks for different lock names in parallel
    // They should not block each other
    await Promise.all([task("lock1", 50), task("lock2", 10)]);

    // Because they are independent, lock2 should finish before lock1
    expect(log).toEqual([
      "lock1 started",
      "lock2 started",
      "lock2 finished",
      "lock1 finished",
    ]);
  });

  it("should serialize execution for the same lock name", async () => {
    const log: string[] = [];

    const task = async (id: number, delay: number) => {
      await multiLock.execute(async () => {
        log.push(`task ${id} started`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        log.push(`task ${id} finished`);
      }, "shared-lock");
    };

    // Run tasks for the SAME lock name
    await Promise.all([task(1, 50), task(2, 10)]);

    // task 2 must wait for task 1
    expect(log).toEqual([
      "task 1 started",
      "task 1 finished",
      "task 2 started",
      "task 2 finished",
    ]);
  });

  it("should allow manual acquire and release", async () => {
    const lockName = "manual-lock";
    let isLocked = false;

    await multiLock.acquire(lockName);
    isLocked = true;

    const promise = multiLock.execute(async () => {
      return "done";
    }, lockName);

    // Check that the execution is blocked
    let finished = false;
    promise.then(() => (finished = true));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(finished).toBe(false);

    multiLock.release(lockName);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isLocked = false;

    const result = await promise;
    expect(result).toBe("done");
    expect(finished).toBe(true);
  });

  it("should throw error when releasing a non-existing lock", () => {
    expect(() => {
      multiLock.release("non-existent");
    }).toThrow("Trying to release a non existing lock. should be impossible");
  });

  it("should handle multiple concurrent lock requests safely (race condition check for lockFor)", async () => {
    const lockName = "concurrency-test";

    // Attempting to acquire the same lock name many times simultaneously
    // to verify that this.lock (the internal mutex) prevents duplicate Lock creation
    const results = await Promise.all(
      [
        multiLock.acquire(lockName),
        multiLock.acquire(lockName),
        multiLock.acquire(lockName),
      ].map(async (p, i) => {
        if (i === 0) {
          // first one gets it
          await p;
          setTimeout(() => multiLock.release(lockName), 10);
          return "first";
        }
        // others wait
        await p;
        setTimeout(() => multiLock.release(lockName), 10);
        return "subsequent";
      })
    );

    expect(results).toContain("first");
    expect(results.filter((r) => r === "subsequent").length).toBe(2);
  });
});
