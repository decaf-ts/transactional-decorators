import { OtherModelAsync, TestModelAsync, TestModelAsync2 } from "./TestModel";
import { transactional } from "../../src";
import { RamRepository } from "./RamRepository";
import { Constructor, Model, required } from "@decaf-ts/decorator-validation";
import { findModelId, IRepository, Repository } from "@decaf-ts/db-decorators";
import { prop } from "@decaf-ts/decoration";
import { sf } from "@decaf-ts/logging";

export class TransactionalRepository extends RamRepository<TestModelAsync> {
  private readonly timeout: number;
  private readonly isRandom: boolean;

  constructor(
    timeout: number,
    isRandom: boolean = false,
    ram: Record<string, any> = {}
  ) {
    super(TestModelAsync, ram);
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
    const result = await super.create(model);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }

  @transactional()
  async delete(key: any) {
    const result = await super.delete(key);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }

  async read(key: any) {
    const result = await super.read(key);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }

  @transactional()
  async update(model: TestModelAsync) {
    const result = await super.update(model);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }
}

export class OtherTransactionalRepository extends RamRepository<TestModelAsync> {
  private readonly timeout: number;
  private readonly isRandom: boolean;

  constructor(
    timeout: number,
    isRandom: boolean = false,
    ram: Record<string, any> = {}
  ) {
    super(TestModelAsync, ram);
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
    const result = await super.create(model);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }

  @transactional()
  async delete(key: any) {
    const result = await super.delete(key);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }

  async read(key: any) {
    const result = await super.read(key);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }

  @transactional()
  async update(model: TestModelAsync) {
    const result = await super.update(model);
    await new Promise((resolve) => setTimeout(resolve, this.getTimeout()));
    return result;
  }
}

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

export class DBMock<T extends Model> implements IRepository<T> {
  private _cache: Record<string, any> = {};

  constructor(private timeout = 200) {}
  pk: keyof T;

  @transactional()
  async create(model: T): Promise<T> {
    const key: string = (findModelId(model) as string) + model.constructor.name;
    await new Promise<any>((resolve) => setTimeout(resolve, this.timeout));
    if (key in this._cache)
      throw new Error(sf("Record with key {0} already exists", key));
    this._cache[key] = model;
    return model;
  }

  async read(key: any): Promise<T> {
    await new Promise<any>((resolve) => setTimeout(resolve, this.timeout / 4));
    if (!(key in this._cache))
      throw new Error(sf("Record with key {0} does not exist", key));
    return this._cache[key];
  }

  @transactional()
  async update(model: T): Promise<T> {
    const key: string = (findModelId(model) as string) + model.constructor.name;
    await new Promise<any>((resolve) => setTimeout(resolve, this.timeout));
    if (key in this._cache)
      throw new Error(sf("Record with key {0} already exists", key));
    this._cache[key] = model;
    return model;
  }

  @transactional()
  async delete(key: any): Promise<T> {
    await new Promise<any>((resolve) => setTimeout(resolve, this.timeout / 4));
    if (!(key in this._cache))
      throw new Error(sf("Record with key {0} does not exist", key));
    const cached = this._cache[key];
    delete this._cache[key];
    return cached;
  }

  readonly class: Constructor<T>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createAll(models: T[], ...args: any[]): Promise<T[]> {
    return Promise.resolve([]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deleteAll(keys: string[] | number[], ...args: any[]): Promise<T[]> {
    return Promise.resolve([]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  readAll(keys: string[] | number[], ...args: any[]): Promise<T[]> {
    return Promise.resolve([]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateAll(models: T[], ...args: any[]): Promise<T[]> {
    return Promise.resolve([]);
  }
}

export class DBRepo<T extends Model<boolean>> extends Repository<T> {
  constructor(
    clazz: Constructor<T>,
    private db = new DBMock<T>()
  ) {
    super(clazz);
  }

  @transactional()
  async create(model: T) {
    return this.db.create(model);
  }

  @transactional()
  async delete(key: any) {
    return this.db.delete(key);
  }

  async read(key: any) {
    return this.db.read(key);
  }

  @transactional()
  async update(model: T) {
    return this.db.update(model);
  }

  @transactional()
  async createAll(models: T[]) {
    const result = [];
    for (const model of models) {
      result.push(await this.create(model));
    }
    return result;
  }
}

export class GenericCaller3 {
  @required()
  @prop()
  private repo1: DBRepo<TestModelAsync> = new DBRepo(TestModelAsync);

  @required()
  @prop()
  private repo2: DBRepo<OtherModelAsync> = new DBRepo(OtherModelAsync);

  @transactional()
  async runPromise(model: TestModelAsync) {
    const created1 = await this.repo1.create(model);
    const created2 = await this.repo2.create(
      new OtherModelAsync(
        Object.assign({}, model, {
          id: created1.id + "_other",
        })
      )
    );
    return { created1, created2 };
  }
}

export class DBMock2 {
  private _cache: Record<string, Record<string | number, any>> = {};

  constructor(private timeout = 200) {}

  @transactional()
  async create<T extends Model>(tableName: string, model: T): Promise<T> {
    const key: string = findModelId(model) as string;
    if (!(tableName in this._cache)) {
      this._cache[tableName] = {};
    }
    await new Promise<any>((resolve) => setTimeout(resolve, this.timeout));
    if (key in this._cache)
      throw new Error(sf("Record with key {0} already exists", key));
    this._cache[tableName][key] = model;
    return model;
  }

  async read<T extends Model>(tableName: string, key: any): Promise<T> {
    await new Promise<any>((resolve) => setTimeout(resolve, this.timeout / 4));
    if (!(tableName in this._cache))
      throw new Error(sf("Table {0} does not exist", tableName));
    if (!(key in this._cache[tableName]))
      throw new Error(sf("Record with key {0} does not exist", key));
    return this._cache[tableName][key];
  }

  @transactional()
  async update<T extends Model>(tableName: string, model: T): Promise<T> {
    const key: string = findModelId(model) as string;
    await new Promise<any>((resolve) => setTimeout(resolve, this.timeout));
    if (!(tableName in this._cache))
      throw new Error(sf("Table {0} does not exist", tableName));
    if (key in this._cache[tableName])
      throw new Error(sf("Record with key {0} already exists", key));
    this._cache[tableName][key] = model;
    return model;
  }

  @transactional()
  async delete<T extends Model>(tableName, key: any): Promise<T> {
    await new Promise<any>((resolve) => setTimeout(resolve, this.timeout / 4));
    if (!(tableName in this._cache))
      throw new Error(sf("Table {0} does not exist", tableName));
    if (!(key in this._cache[tableName]))
      throw new Error(sf("Record with key {0} does not exist", key));
    const cached = this._cache[tableName][key];
    delete this._cache[tableName][key];
    return cached;
  }
}

export class DBRepo2<T extends Model<boolean>> extends Repository<T> {
  constructor(
    clazz: Constructor<T>,
    private db = new DBMock2()
  ) {
    super(clazz);
  }

  @transactional()
  async create(model: T) {
    return this.db.create(this.class.name, model);
  }

  @transactional()
  async delete(key: any): Promise<T> {
    return this.db.delete(this.class.name, key);
  }

  async read(key: any): Promise<T> {
    return this.db.read(this.class.name, key);
  }

  @transactional()
  async update(model: T): Promise<T> {
    return this.db.update(this.class.name, model);
  }

  @transactional()
  async createAll(models: T[]) {
    const result = [];
    for (const model of models) {
      result.push(await this.create(model));
    }
    return result;
  }
}

const dbMock2Instance = new DBMock2();

export class GenericCaller2 {
  @required()
  @prop()
  private repo1 = new DBRepo2(TestModelAsync, dbMock2Instance);

  @required()
  @prop()
  private repo2 = new DBRepo2(TestModelAsync2, dbMock2Instance);

  @transactional()
  async runPromise(model: TestModelAsync) {
    const m2 = new TestModelAsync2(model);

    const created1 = await this.repo1.create(model);
    const created2 = await this.repo2.create(m2);
    // const updated1 = await this.repo1.update(
    //   new TestModelAsync(
    //     Object.assign({}, created1, {
    //       address: "new  address",
    //     })
    //   )
    // );
    // const updated2 = await this.repo2.update(
    //   new TestModelAsync2(
    //     Object.assign({}, created2, {
    //       address: "new  address",
    //     })
    //   )
    // );
    return { created1, created2 };
  }
}
