export function getObjectName(obj: any): string | undefined {
  if (!obj) return;
  if (typeof obj === "string") return obj;
  if (
    obj.constructor &&
    obj.constructor.name &&
    ["Function", "Object"].indexOf(obj.constructor.name) === -1
  )
    return obj.constructor.name;
  if (typeof obj === "function" && obj.name) return obj.name;
  return obj.toString();
}
