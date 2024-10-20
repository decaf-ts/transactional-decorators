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
    super();
    Model.fromObject(this, testModel);
  }
}

@model()
export class InheritanceTestModel extends TestModelAsync {
  public constructor(testModel?: ModelArg<InheritanceTestModel>) {
    super(testModel);
    Model.fromObject(this, testModel);
    if (this.updatedOn) this.updatedOn = new Date(this.updatedOn);
    if (this.createdOn) this.createdOn = new Date(this.createdOn);
  }
}
