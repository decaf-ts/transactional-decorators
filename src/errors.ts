import { InternalError } from "@decaf-ts/db-decorators";

export class TimeoutError extends InternalError {
  constructor(message: string | Error = "Transaction timed out") {
    super(message, TimeoutError.name, 500);
  }
}
