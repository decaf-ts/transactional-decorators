import { transactionalSuperCall } from "../../src";
import { TestModelAsync } from "./TestModel";
import { transactional } from "../../src";
import { RamRepository } from "./RamRepository";
import { Model } from "@decaf-ts/decorator-validation";
import { Class, LoggedClass } from "@decaf-ts/logging";

export class DBMock<T extends Model<boolean>> extends LoggedClass {
  private cache: { [indexer: string]: any } = {};

  constructor(private timeout = 200) {
    super();
  }

  @transactional()
  async create(key: any, model: T): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, this.timeout));
    if (key in this.cache)
      throw new Error(`Record with key ${key} already exists`);
    this.cache[key] = model;
    return model;
  }

  async read(key: any): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, this.timeout / 4));
    if (!(key in this.cache))
      throw new Error(`Record with key ${key} does not exist`);
    return this.cache[key];
  }

  @transactional()
  async update(key: any, model: T): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, this.timeout));
    if (key in this.cache)
      throw new Error(`Record with key ${key} already exists`);
    this.cache[key] = model;
    return model;
  }

  @transactional()
  async delete(key: any): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, this.timeout));
    if (!(key in this.cache))
      throw new Error(`Record with key ${key} does not exist`);
    const _cached = this.cache[key];
    delete this.cache[key];
    return _cached;
  }
}

export class DBRepo<T extends Model<boolean>> extends RamRepository<T> {
  private db = new DBMock();

  constructor(clazz: Class<T>) {
    super(clazz);
  }

  @transactional()
  async create(model: T): Promise<T> {
    return (await this.db.create(
      model["id" as keyof typeof model],
      model
    )) as T;
  }

  @transactional()
  async delete(key: any): Promise<T> {
    return (await this.db.delete(key)) as T;
  }

  async read(key: any): Promise<T> {
    return (await this.db.read(key)) as T;
  }

  @transactional()
  async update(model: T): Promise<T> {
    return (await this.db.update(
      model["id" as keyof typeof model],
      model
    )) as T;
  }

  @transactional()
  async createAll(models: T[]): Promise<T[]> {
    const log = this.log.for(this.createAll);
    log.silly(`Trying to create ${models.length} records`);

    return Promise.all(models.map((model) => this.create(model)));
  }
}

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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<TestModelAsync>(async (resolve, reject) => {
      let result;
      try {
        result = await transactionalSuperCall(super.create.bind(this), model);
      } catch (e: any) {
        return reject(e);
      }
      setTimeout(() => resolve(result), self.getTimeout());
    });
  }

  @transactional()
  async delete(key: any) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<TestModelAsync>(async (resolve, reject) => {
      let result;
      try {
        result = await transactionalSuperCall(super.delete.bind(this), key);
      } catch (e: any) {
        return reject(e);
      }
      setTimeout(() => resolve(result), self.getTimeout());
    });
  }

  async read(key: any) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<TestModelAsync>(async (resolve, reject) => {
      let result;
      try {
        result = await transactionalSuperCall(super.read.bind(this), key);
      } catch (e: any) {
        return reject(e);
      }
      setTimeout(() => resolve(result), self.getTimeout());
    });
  }

  @transactional()
  update(model: TestModelAsync) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<TestModelAsync>(async (resolve, reject) => {
      let result;
      try {
        result = await transactionalSuperCall(super.update.bind(this), model);
      } catch (e: any) {
        return reject(e);
      }
      setTimeout(() => resolve(result), self.getTimeout());
    });
  }
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
