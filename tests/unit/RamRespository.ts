import {DBModel, findModelId, NotFoundError, Repository} from "@decaf-ts/db-decorators";
import {Constructor} from "@decaf-ts/decorator-validation";
import {transactional} from "../../src";

export class RamRepository<T extends DBModel> extends Repository<T> {
  protected ram: Record<string, T> = {};

  constructor(clazz?: Constructor<T>) {
    super(clazz)
  }

  @transactional()
  async create(model: T): Promise<T> {
    const pk = findModelId(model);
    this.ram[pk] = model;
    return model;
  }

  @transactional()
  async delete(key: string | number): Promise<T> {
    const self = this;
    const toDelete = self.ram[key];
    delete self.ram[key];
    return toDelete
  }

  async read(key: string | number): Promise<T> {
    if (!(key in this.ram))
      throw new NotFoundError(`${key} not found`)
    return this.ram[key];
  }

  @transactional()
  async update(model: T): Promise<T> {
    const pk = findModelId(model);
    this.ram[pk] = model;
    return model;
  }
}