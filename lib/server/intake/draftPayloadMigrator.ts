/**
 * Domain 2.5 — One-time migration from nested legacy intake payload
 * blobs to flat canonical-key blobs.
 *
 * Driven by `form_alignment_mappings` (purpose='intake'). For each mapping
 * the service reads the dotted `intake_field_path` out of the v1 payload
 * and writes the value under the mapping's `canonical_field_key` in the
 * output blob.
 *
 * Pure — never throws, never touches the DB. The backfill script
 * (scripts/backfillDraftPayloads.ts) loads the mappings + session rows and
 * calls this function per row.
 */

export interface FormAlignmentMapping {
  canonical_field_key: string;
  intake_field_path: string | null;
  mapping_purpose: "intake" | "eligibility" | "output" | "computed";
}

/**
 * Safe dotted-path accessor.
 *
 *   getValueAtPath({ victim: { firstName: "Jane" } }, "victim.firstName")
 *     → "Jane"
 *   getValueAtPath({}, "victim.firstName") → undefined
 *   getValueAtPath(null, "x") → undefined
 *
 * Bracket indices like `employment.employmentHistory[0].employerName` are
 * supported by splitting on `.` and stripping `[n]` — arrays are indexed
 * numerically.
 */
export function getValueAtPath(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  let cursor: unknown = obj;
  for (const raw of path.split(".")) {
    if (cursor === null || cursor === undefined) return undefined;
    // Handle "employmentHistory[0]" — split off the bracket index.
    const bracketMatch = raw.match(/^(.+?)\[(\d+)\]$/);
    if (bracketMatch) {
      const prop = bracketMatch[1];
      const idx = Number.parseInt(bracketMatch[2], 10);
      if (typeof cursor !== "object") return undefined;
      cursor = (cursor as Record<string, unknown>)[prop];
      if (!Array.isArray(cursor)) return undefined;
      cursor = cursor[idx];
      continue;
    }
    if (typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[raw];
  }
  return cursor;
}

/**
 * Walk every intake-purpose mapping and copy values out of the v1 payload
 * into a fresh flat object keyed on `canonical_field_key`.
 *
 * Skips entries whose source path resolves to `undefined` or `null` so the
 * output blob doesn't carry sentinel nulls.
 */
export function migrateV1DraftToV2(
  v1Payload: Record<string, unknown> | null | undefined,
  mappings: FormAlignmentMapping[],
): Record<string, unknown> {
  if (!v1Payload || typeof v1Payload !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const m of mappings) {
    if (m.mapping_purpose !== "intake") continue;
    const path = m.intake_field_path ?? m.canonical_field_key;
    if (!path) continue;
    const value = getValueAtPath(v1Payload, path);
    if (value === undefined || value === null) continue;
    out[m.canonical_field_key] = value;
  }
  return out;
}
