export function isEmptyString(value: string | undefined | null): boolean {
  return value === undefined || value === null || value === "";
}

export function stringOrNull(val: unknown): string | null {
  if (typeof val !== "string") {
    return null;
  }

  return val === "" ? null : val;
}
