/**
 * Victim “connect with organization” — structured help areas (org-facing triage).
 */

export const ORGANIZATION_CONNECT_HELP_NEED_KEYS = [
  "general_support",
  "police_report",
  "medical_bills",
  "employment",
  "funeral",
] as const;

export type OrganizationConnectHelpNeedKey =
  (typeof ORGANIZATION_CONNECT_HELP_NEED_KEYS)[number];

const ALLOWED = new Set<string>(ORGANIZATION_CONNECT_HELP_NEED_KEYS);

export function normalizeOrganizationConnectHelpNeeds(raw: unknown): OrganizationConnectHelpNeedKey[] {
  if (!Array.isArray(raw)) return [];
  const out: OrganizationConnectHelpNeedKey[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const k = item.trim();
    if (!ALLOWED.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(k as OrganizationConnectHelpNeedKey);
  }
  return out;
}

/** Short English phrases for notifications / admin (not user-facing i18n). */
export function formatHelpNeedsForOrgNotification(
  keys: OrganizationConnectHelpNeedKey[],
  labels: Record<OrganizationConnectHelpNeedKey, string>
): string {
  if (keys.length === 0) return "";
  return keys.map((k) => labels[k]).join(", ");
}
