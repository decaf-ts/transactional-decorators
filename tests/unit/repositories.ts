import { TestModelAsync } from "./TestModel";
import { transactional } from "../../src";
import { RamRepository } from "./RamRepository";
import { Constructor, Model, required } from "@decaf-ts/decorator-validation";
import { findModelId, IRepository, Repository } from "@decaf-ts/db-decorators";
import { prop } from "@decaf-ts/decoration";
import { sf } from "@decaf-ts/logging";

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
    const key: string = findModelId(model) as string;
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
    const key: string = findModelId(model) as string;
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
  private db = new DBMock<T>();

  constructor(clazz: Constructor<T>) {
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
