import { BaseError } from "@decaf-ts/db-decorators";

export class TransactionalError extends BaseError {
  constructor(msg: string | Error) {
    super(TransactionalError.name, msg, 500);
  }
}
