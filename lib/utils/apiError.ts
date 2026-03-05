/**
 * Extract a displayable error message from API error response (Phase 0 standardized shape).
 * Supports both { error: string } and { ok: false, error: { message }, message }.
 */
export function getApiErrorMessage(
  json: unknown,
  fallback = "An error occurred"
): string {
  if (!json || typeof json !== "object") return fallback;
  const o = json as Record<string, unknown>;
  if (typeof o.message === "string") return o.message;
  const err = o.error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && typeof (err as any).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
}
