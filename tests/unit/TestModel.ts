import {
  minlength,
  model,
  Model,
  ModelArg,
} from "@decaf-ts/decorator-validation";
import { DBOperations, readonly, timestamp, id } from "@decaf-ts/db-decorators";

@model()
export class TestModelAsync extends Model {
  @id()
  id?: string | number = undefined;

  @readonly()
  name?: string = undefined;

  @minlength(5)
  address?: string = undefined;

  @timestamp()
  updatedOn?: Date = undefined;

  @timestamp(DBOperations.CREATE)
  @readonly()
  createdOn?: Date = undefined;

  public constructor(testModel?: ModelArg<TestModelAsync>) {
    super(testModel);
  }
}

@model()
export class TestModelAsync2 extends Model {
  @id()
  id?: string | number = undefined;

  @readonly()
  name?: string = undefined;

  @minlength(5)
  address?: string = undefined;

  @timestamp()
  updatedOn?: Date = undefined;

  @timestamp(DBOperations.CREATE)
  @readonly()
  createdOn?: Date = undefined;

  public constructor(testModel?: ModelArg<TestModelAsync>) {
    super(testModel);
  }
}

@model()
export class InheritanceTestModel extends TestModelAsync {
  public constructor(testModel?: ModelArg<InheritanceTestModel>) {
    super(testModel);
  }
}
