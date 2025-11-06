import "@decaf-ts/decoration";
import { Constructor } from "@decaf-ts/decorator-validation";

declare module "@decaf-ts/decoration" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Metadata {
    function transactionals<T>(obj: Constructor<T>): (keyof T)[];
    function isTransactional<T>(obj: Constructor<T>): boolean;
  }
}
