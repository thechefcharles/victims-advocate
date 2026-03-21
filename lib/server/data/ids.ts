/**
 * Compare user ids from Postgres UUID columns and JWT / auth context.
 */
export function sameUserId(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  const sa = String(a).trim().toLowerCase();
  const sb = String(b).trim().toLowerCase();
  return sa.length > 0 && sb.length > 0 && sa === sb;
}
