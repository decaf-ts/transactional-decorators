import { Callback, transactionalSuperCall } from "../../src";
import { TestModelAsync } from "./TestModel";
import { transactional } from "../../src";
import { RamRepository } from "./RamRepository";
import { Model, required } from "@decaf-ts/decorator-validation";
import { Repository } from "@decaf-ts/db-decorators";
import { prop } from "@decaf-ts/decoration";

export class TransactionalRepository extends RamRepository<TestModelAsync> {
  private readonly timeout: number;
  private readonly isRandom: boolean;

  constructor(timeout: number, isRandom: boolean = false) {
    super(TestModelAsync);
    this.timeout = timeout;
    this.isRandom = isRandom;
  }

  private getTimeout() {
    return !this.isRandom
      ? this.timeout
      : Math.floor(Math.random() * this.timeout);
  }

  @transactional()
  async create(model: TestModelAsync): Promise<TestModelAsync> {
    const result = await transactionalSuperCall(super.create.bind(this), model);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }

  @transactional()
  async delete(key: any) {
    const result = await transactionalSuperCall(super.delete.bind(this), key);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }

  async read(key: any) {
    const result = await transactionalSuperCall(super.read.bind(this), key);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }

  @transactional()
  async update(model: TestModelAsync) {
    const result = await transactionalSuperCall(super.update.bind(this), model);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }
}

export class OtherTransactionalRepository extends RamRepository<TestModelAsync> {
  private readonly timeout: number;
  private readonly isRandom: boolean;

  constructor(timeout: number, isRandom: boolean = false) {
    super(TestModelAsync);
    this.timeout = timeout;
    this.isRandom = isRandom;
  }

  private getTimeout() {
    return !this.isRandom
      ? this.timeout
      : Math.floor(Math.random() * this.timeout);
  }

  @transactional()
  async create(model: TestModelAsync): Promise<TestModelAsync> {
    const result = await transactionalSuperCall(super.create.bind(this), model);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }

  @transactional()
  async delete(key: any) {
    const result = await transactionalSuperCall(super.delete.bind(this), key);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }

  async read(key: any) {
    const result = await transactionalSuperCall(super.read.bind(this), key);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }

  @transactional()
  async update(model: TestModelAsync) {
    const result = await transactionalSuperCall(super.update.bind(this), model);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }
}

// @Transactional()
export class GenericCaller {
  @required()
  @prop()
  private repo1: TransactionalRepository = new TransactionalRepository(
    200,
    false
  );

  @required()
  @prop()
  private repo2: OtherTransactionalRepository =
    new OtherTransactionalRepository(300, true);

  @transactional()
  async runPromise(model: TestModelAsync) {
    const created1 = await this.repo1.create(model);
    const created2 = await this.repo2.create(model);
    return { created1, created2 };
  }
}

export function managerCallIterator<T extends Model>(
  this: Repository<T>,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  func: Function,
  ...args: (any | Callback)[]
) {
  if (!args || args.length < 1) throw new Error("Needs at least a callback");
  const callback: Callback = args.pop();

  if (!args.every((a) => Array.isArray(a) && a.length === args[0].length))
    return callback(new Error(`Invalid argument length`));

  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const self = this;

  const iterator = function (accum: T[], ...argz: any[]) {
    const callback: Callback = argz.pop();
    const callArgs = argz.map((a) => a.shift()).filter((a) => !!a);

    if (!callArgs.length) return callback(undefined, accum);

    try {
      func.call(self, ...callArgs, (err: Error, results: T) => {
        if (err) return callback(err);
        accum.push(results);
        iterator(accum, ...argz, callback);
      });
    } catch (e) {
      return callback(e as Error);
    }
  };

  iterator([], ...args, (err: Error, results: any[]) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    err ? callback(err) : callback(undefined, results);
  });
}
//
// // @Transactional()
// export class DBMock<T extends Model> implements IRepository<T> {
//   private _cache: Record<string, any> = {};
//
//   constructor(model: Constructor<T>, private timeout = 200) {}
//
//   @transactional()
//   async create(model: T): Promise<T> {
//     // eslint-disable-next-line @typescript-eslint/no-this-alias
//     const self = this;
//     return new Promise<T>((resolve, reject) => {
//       const key = findModelId(model);
//       setTimeout(() => {
//         if (key in self._cache)
//           return reject(
//             new Error(sf("Record with key {0} already exists", key))
//           );
//         self._cache[key] = model;
//         resolve(model);
//       }, self.timeout);
//     });
//   }
//
//   async read(key: any): Promise<T> {
//     // eslint-disable-next-line @typescript-eslint/no-this-alias
//     const self = this;
//     return new Promise<T>((resolve, reject) => {
//       setTimeout(() => {
//         if (!(key in self._cache))
//           return reject(
//             new Error(sf("Record with key {0} does not exist", key))
//           );
//         resolve(self._cache[key]);
//       }, self.timeout / 4);
//     });
//   }
//
//   @transactional()
//   async update(model: T): Promise<T> {
//     // eslint-disable-next-line @typescript-eslint/no-this-alias
//     const self = this;
//     return new Promise<T>((resolve, reject) => {
//       const key = findModelId(model);
//       setTimeout(() => {
//         if (key in self._cache)
//           return reject(
//             new Error(sf("Record with key {0} already exists", key))
//           );
//         self._cache[key] = model;
//         resolve(model);
//       }, self.timeout);
//     });
//   }
//
//   @transactional()
//   async delete(key: any): Promise<T> {
//     // eslint-disable-next-line @typescript-eslint/no-this-alias
//     const self = this;
//     return new Promise<T>((resolve, reject) => {
//       setTimeout(() => {
//         if (!(key in self._cache))
//           return reject(
//             new Error(sf("Record with key {0} does not exist", key))
//           );
//         const _cached = self._cache[key];
//         delete self._cache[key];
//         resolve(_cached);
//       }, self.timeout / 4);
//     });
//   }
//
//   readonly cache: DataCache = new DataCache();
//   readonly class: Constructor<T>;
//
//   createAll(models: T[], ...args: any[]): Promise<T[]> {
//     return Promise.resolve([]);
//   }
//
//   deleteAll(keys: string[] | number[], ...args: any[]): Promise<T[]> {
//     return Promise.resolve([]);
//   }
//
//   readAll(keys: string[] | number[], ...args: any[]): Promise<T[]> {
//     return Promise.resolve([]);
//   }
//
//   updateAll(models: T[], ...args: any[]): Promise<T[]> {
//     return Promise.resolve([]);
//   }
// }
//
// export class DBRepo<T extends Model> extends Repository<T> {
//   private db = new DBMock();
//
//   constructor(clazz: { new (): T }) {
//     super(clazz);
//   }
//
//   @transactional()
//   async create(model: T) {
//     return this.db.create(model);
//   }
//
//   @transactional()
//   async delete(key: any) {
//     return this.db.delete(key);
//   }
//
//   async read(key: any) {
//     return this.db.read(key);
//   }
//
//   @transactional()
//   async update(model: T) {
//     return this.db.update(model);
//   }
//
//   @transactional()
//   createAll(...args: (any | Callback)[]): void {
//     const callback: Callback = args.pop();
//     if (!callback) throw new Error("No callback");
//     const self = this;
//     // all.call(self, "Trying to create {1} records under the {0} table", "generic", args[0].length);
//
//     managerCallIterator.call(
//       this as any,
//       this.create.bind(this),
//       ...args,
//       (err: Err, models: T[]) => {
//         if (err || !models || !models.length) return callback(err);
//         // all.call(self, "{1} records created under the {0} table", "generic", models.length);
//         callback(undefined, models);
//       }
//     );
//   }
// }
