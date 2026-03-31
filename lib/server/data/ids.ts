/**
 * Compare user ids from Postgres UUID columns and JWT / auth context.
 */

/** Hyphenated 128-bit hex id accepted by Postgres `uuid` (not only RFC variant/version). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidString(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** Canonical form for API/DB (Postgres rejects leading/trailing whitespace on `uuid`). */
export function normalizeCaseIdParam(value: string): string {
  return value.trim().toLowerCase();
}

export function sameUserId(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  const sa = String(a).trim().toLowerCase();
  const sb = String(b).trim().toLowerCase();
  return sa.length > 0 && sb.length > 0 && sa === sb;
}
