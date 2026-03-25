/**
 * Phase 4: Classify org profile patch fields — safe updates vs sensitive (log/flag, never block).
 *
 * Safe = routine ops (hours, capacity, languages, etc.).
 * Sensitive = trust-impacting (name, services, coverage, populations, profile workflow, org type).
 */

/** Fields that are routine and do not trigger sensitive_update audit by default. */
const SAFE_ORG_PROFILE_PATCH_FIELDS = new Set([
  "hours",
  "intake_methods",
  "capacity_status",
  "accepting_clients",
  "languages",
  "accessibility_features",
  "avg_response_time_hours",
]);

/** Explicitly treated as sensitive (extra clear for name/type when wired into PATCH). */
const SENSITIVE_ORG_PROFILE_PATCH_FIELDS = new Set([
  "name",
  "type",
  "service_types",
  "coverage_area",
  "special_populations",
  "profile_status",
]);

/**
 * True when a changed profile field should be logged as org.profile.sensitive_update.
 * Unknown field names default to sensitive so new PATCH keys do not slip past review unseen.
 */
export function isSensitiveOrgField(fieldName: string): boolean {
  const k = fieldName.trim();
  if (!k) return false;
  if (SAFE_ORG_PROFILE_PATCH_FIELDS.has(k)) return false;
  if (SENSITIVE_ORG_PROFILE_PATCH_FIELDS.has(k)) return true;
  return true;
}

export function filterSensitiveChangedKeys(changedKeys: readonly string[]): string[] {
  return changedKeys.filter((k) => isSensitiveOrgField(k));
}
