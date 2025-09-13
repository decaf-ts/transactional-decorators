import {
  findModelId,
  NotFoundError,
  Repository,
} from "@decaf-ts/db-decorators";
import { Constructor, Model } from "@decaf-ts/decorator-validation";
import { transactional } from "../../src";

export class RamRepository<T extends Model> extends Repository<T> {
  protected ram: Record<string, T> = {};

  constructor(clazz?: Constructor<T>) {
    super(clazz);
  }

  @transactional()
  async create(model: T): Promise<T> {
    const pk = findModelId(model);
    this.ram[pk as string] = model;
    return model;
  }

  @transactional()
  async delete(key: string | number): Promise<T> {
    const toDelete = this.ram[key];
    delete this.ram[key];
    return toDelete;
  }

  async read(key: string | number): Promise<T> {
    if (!(key in this.ram)) throw new NotFoundError(`${key} not found`);
    return this.ram[key];
  }

  @transactional()
  async update(model: T): Promise<T> {
    const pk = findModelId(model);
    this.ram[pk as string] = model;
    return model;
  }
}
