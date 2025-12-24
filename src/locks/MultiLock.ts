import { Lock } from "./Lock";

export class MultiLock extends Lock {
  protected locks: Record<string, Lock> = {};
  protected lock = new Lock();

  constructor() {
    super();
  }

  protected async lockFor(name: string): Promise<Lock> {
    await this.lock.acquire();
    if (!this.locks[name]) this.locks[name] = new Lock();
    this.lock.release();
    return this.locks[name];
  }

  override async execute(
    func: () => any,
    name: string,
    ...args: any[]
  ): Promise<any> {
    const lock = await this.lockFor(name);
    return lock.execute(func, ...args);
  }

  override async acquire(name: string, ...args: any[]): Promise<void> {
    const lock = await this.lockFor(name);
    return lock.acquire(...args);
  }

  override release(name: string, ...args: any[]) {
    if (!(name in this.locks))
      throw new Error(
        `Trying to release a non existing lock. should be impossible`
      );
    const lock = this.locks[name];
    return lock.release(...args);
  }
}
