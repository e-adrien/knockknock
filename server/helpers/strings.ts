export function isEmptyString(value: string | undefined | null): boolean {
  return value === undefined || value === null || value === "";
}
