import { Metadata } from "@decaf-ts/decoration";
import { TransactionalKeys } from "../constants";
import { Constructor } from "@decaf-ts/decoration";

(Metadata as any).transactionals = function <T>(
  obj: Constructor<T>
): (keyof T)[] {
  const meta = Metadata.get(obj, TransactionalKeys.TRANSACTIONAL);
  if (!meta) return [];
  return Object.keys(meta) as (keyof T)[];
};

(Metadata as any).isTransactional = function <T>(obj: Constructor<T>): boolean {
  return !!Metadata.get(obj, TransactionalKeys.TRANSACTIONAL);
};
