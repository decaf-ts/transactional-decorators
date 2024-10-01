import {VERSION} from "../../src";

describe("Distribution Tests", () => {
  it ("reads lib", () => {
    const {VERSION} = require("../../lib/index.cjs");
    expect(VERSION).toBeDefined();
  })

  it("reads JS Bundle", () => {
    const {VERSION} = require("../../dist/transactional-decorators.bundle.min.js");
    expect(VERSION).toBeDefined();
  })
})