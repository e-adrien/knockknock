export function deepFreeze<T extends object>(object: T): T {
  // Retrieve the property names defined on object
  const propNames = Reflect.ownKeys(object);

  // Freeze properties before freezing self
  for (const name of propNames) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (object as any)[name];

    if ((value && typeof value === "object") || typeof value === "function") {
      deepFreeze(value);
    }
  }

  return Object.freeze(object);
}
