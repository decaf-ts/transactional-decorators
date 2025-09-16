import {
  OtherTransactionalRepository,
  TransactionalRepository,
} from "./repositories";
import { transactional } from "../../src/index";
import { TestModelAsync } from "./TestModel";
import { LoggedClass } from "@decaf-ts/logging";

export class GenericCaller extends LoggedClass {
  private repo1: TransactionalRepository = new TransactionalRepository(
    200,
    false
  );

  private repo2: OtherTransactionalRepository =
    new OtherTransactionalRepository(300, true);

  constructor() {
    super();
  }

  @transactional()
  async run(model: TestModelAsync) {
    const log = this.log.for(this.run);
    const created1 = await this.repo1.create(model);
    log.info(`Created model 1 ${created1.id}`);
    const created2 = await this.repo2.create(created1);
    log.info(`Created model 2 ${created2.id}`);
    return { model1: created1, model2: created2 };
  }
}
