import {
  minlength,
  model,
  Model,
  ModelArg,
} from "@decaf-ts/decorator-validation";
import {
  DBOperations,
  readonly,
  timestamp,
  id,
  TimestampValidator,
} from "@decaf-ts/db-decorators";
const a = TimestampValidator;

@model()
export class TestModelAsync extends Model {
  @id()
  id!: string | number;

  @readonly()
  name?: string;

  @minlength(5)
  address?: string;

  @timestamp()
  updatedOn!: Date;

  @timestamp(DBOperations.CREATE)
  @readonly()
  createdOn!: Date;

  constructor(testModel?: ModelArg<TestModelAsync>) {
    super(testModel);
  }
}

@model()
export class InheritanceTestModel extends TestModelAsync {
  constructor(testModel?: ModelArg<InheritanceTestModel>) {
    super(testModel);
  }
}
