import {Callback, transactionalSuperCall} from "../../src";
import {TestModelAsync} from "./TestModel";
import {transactional} from "../../src";
import {RamRepository} from "./RamRespository";
import {sf} from "@decaf-ts/decorator-validation";
import {DBModel, Repository} from "@decaf-ts/db-decorators";

export class TransactionalRepository extends RamRepository<TestModelAsync>{
  private readonly timeout: number;
  private readonly isRandom: boolean;

  constructor(timeout: number, isRandom: boolean = false) {
    super(TestModelAsync);
    this.timeout = timeout;
    this.isRandom = isRandom;
  }

  private getTimeout(){
    return !this.isRandom ? this.timeout : Math.floor(Math.random() * this.timeout)
  }

  @transactional()
  create(key: any, model: TestModelAsync, callback: ModelCallback<TestModelAsync>) : void{
    const self = this;
    transactionalSuperCall(super.create.bind(this), key, model, (...args: any[]) => {
      setTimeout(() => {
        callback(...args)
      }, self.getTimeout())
    });
  }

  @transactional()
  delete(key: any, callback: Callback) {
    const self = this;
    transactionalSuperCall(super.delete.bind(this), key, (...args: any[]) => {
      setTimeout(() => {
        callback(...args)
      }, self.getTimeout())
    });
  }

  read(key: any, callback: ModelCallback<TestModelAsync>) {
    const self = this;
    super.read(key, (...args) => {
      setTimeout(() => {
        callback(...args)
      }, self.getTimeout())
    });
  }

  @transactional()
  update(key: any, model: TestModelAsync, callback: ModelCallback<TestModelAsync>) {
    const self = this;
    transactionalSuperCall(super.update.bind(this), key, model, (...args: any[]) => {
      setTimeout(() => {
        callback(...args)
      }, self.getTimeout())
    });
  }
}


export class OtherTransactionalRepository extends RamRepository<TestModelAsync>{
  private readonly timeout: number;
  private readonly isRandom: boolean;

  constructor(timeout: number, isRandom: boolean = false) {
    super(TestModelAsync);
    this.timeout = timeout;
    this.isRandom = isRandom;
  }

  private getTimeout(){
    return !this.isRandom ? this.timeout : Math.floor(Math.random() * this.timeout)
  }

  @transactional()
  create(key: any, model: TestModelAsync, callback: ModelCallback<TestModelAsync>) : void{
    const self = this;
    transactionalSuperCall(super.create.bind(this), key, model, (...args: any[]) => {
      setTimeout(() => {
        callback(...args)
      }, self.getTimeout())
    });
  }

  @transactional()
  delete(key: any, callback: Callback) {
    const self = this;
    transactionalSuperCall(super.delete.bind(this), key, (...args: any[]) => {
      setTimeout(() => {
        callback(...args)
      }, self.getTimeout())
    });
  }

  read(key: any, callback: ModelCallback<TestModelAsync>) {
    const self = this;
    super.read(key, (...args) => {
      setTimeout(() => {
        callback(...args)
      }, self.getTimeout())
    });
  }

  @transactional()
  update(key: any, model: TestModelAsync, callback: ModelCallback<TestModelAsync>) {
    const self = this;
    transactionalSuperCall(super.update.bind(this), key, model, (...args: any[]) => {
      setTimeout(() => {
        callback(...args)
      }, self.getTimeout())
    });
  }
}

// @Transactional()
export class GenericCaller {

  private repo1: TransactionalRepository = new TransactionalRepository(200, false)

  private repo2: OtherTransactionalRepository = new OtherTransactionalRepository(300, true)

  @transactional()
  runAsync(model: TestModelAsync, callback: Callback){
    const self = this;
    self.repo1.create(Date.now(), model, (err, created1) => {
      if (err || !created1)
        return callback(new Error(sf("Failed to create first model: {0}", err || "Missing result")));
      // info.call(self, "Created first model")
      self.repo2.create(created1.id, created1, (err, created2) => {
        if (err || !created2)
          return callback(new Error(sf( "Failed to create second model: {0}", callback, err || "Missing result")));
        // info.call(self, "Created second model")
        callback(undefined, created1, created2)
      })
    })
  }

  @transactional()
  async runPromise(model: TestModelAsync){
    const self = this;
    return new Promise<{model1: TestModelAsync, model2: TestModelAsync}>((resolve, reject) => {
      self.runAsync(model, (err: Error, model1?: TestModelAsync, model2?: TestModelAsync) => {
        if (err || !model1 || !model2)
          return reject(err || "Missing results")
        resolve({
          model1: model1,
          model2: model2
        })
      })
    })
  }
}


export function managerCallIterator<T extends DBModel>(this: Repository<T>, func: Function, ...args: (any | Callback)[]) {
  if (!args || args.length < 1)
    throw new Error("Needs at least a callback");
  const callback: Callback = args.pop();

  if (!args.every(a => Array.isArray(a) && a.length === args[0].length))
    return callback(`Invalid argument length`);

  const self = this;

  const iterator = function (accum: T[], ...argz: any[]) {
    const callback: Callback = argz.pop();
    const callArgs = argz.map(a => a.shift()).filter(a => !!a);

    if (!callArgs.length)
      return callback(undefined, accum);

    try {
      func.call(self, ...callArgs, (err: Error, results: T) => {
        if (err)
          return callback(err);
        accum.push(results);
        iterator(accum, ...argz, callback);
      });
    } catch (e) {
      return callback(e as Error);
    }
  }

  iterator([], ...args, (err: Error, results: any[]) => {
    err ? callback(err) : callback(undefined, results)
  });
}

@Transactional()
export class DBMock<T extends DBModel> implements Repository<T>{

  private cache: Record<string, any> = {}

  constructor(private timeout = 200) {
  }

  @transactional()
  create(key: any, model: T, callback: Callback): void {
    const self = this;
    setTimeout(() => {
      if (key in self.cache)
        return callback(new Error(sf("Record with key {0} already exists",  key)));
      self.cache[key] = model;
      callback(undefined, model)
    }, self.timeout)
  }

  read(key: any, callback: Callback): void {
    const self = this;
    setTimeout(() => {
      if (!(key in self.cache))
        return callback(new Error(sf("Record with key {0} does not exist", key)));
      callback(undefined, self.cache[key])
    }, self.timeout/4)
  }

  @transactional()
  update(key: any, model: T, callback: Callback): void {
    const self = this;
    setTimeout(() => {
      if (key in self.cache)
        return callback(new Error(sf("Record with key {0} does not exist", key)));
      self.cache[key] = model;
      callback(undefined, model)
    }, self.timeout)
  }

  @transactional()
  delete(key: any, callback: Callback): void {
    const self = this;
    setTimeout(() => {
      if (!(key in self.cache))
        return callback(new Error(sf("Record with key {0} not found to delete", key)));
      delete self.cache[key];
      callback()
    }, self.timeout)
  }
}


export class DBRepo<T extends DBModel> extends Repository<T>{

  private db = new DBMock()

  constructor(clazz: { new(): T }) {
    super(clazz);
  }

  @transactional()
  async create(model: T) {
    return this.db.create(model)
  }

  @transactional()
  async delete(key: any) {
    return this.db.delete(key)
  }

  async read(key: any) {
    return this.db.read(key)
  }

  @transactional()
  async update(model: T) {
    return this.db.update(model)
  }

  @transactional()
  createAll(...args: (any | Callback)[]): void {
    let callback: Callback = args.pop();
    if (!callback)
      throw new Error("No callback");
    const self = this;
    // all.call(self, "Trying to create {1} records under the {0} table", "generic", args[0].length);

    managerCallIterator.call(this as any, this.create.bind(this), ...args, (err: Err, models: T[]) => {
      if (err || !models || !models.length)
        return callback(err);
      // all.call(self, "{1} records created under the {0} table", "generic", models.length);
      callback(undefined, models);
    });
  }
}
