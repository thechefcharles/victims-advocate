/**
 * ORG-1B: DB `org_membership_role` enum values (storage + API bodies).
 *
 * Product model is **Owner · Supervisor · Advocate** via `mapDbOrgRoleToSimple`:
 * `program_manager` is **owner-equivalent** for leadership/management (same simple `owner` as `org_owner`).
 * Lifecycle / “has an owner” checks intentionally count **only** `org_owner` rows (see organizations/state).
 *
 * Phase 4: invite/membership UX may further narrow assignable roles.
 */

export const ORG_MEMBERSHIP_ROLES = [
  "org_owner",
  "program_manager",
  "supervisor",
  "victim_advocate",
  "intake_specialist",
  "auditor",
] as const;

export type OrgRole = (typeof ORG_MEMBERSHIP_ROLES)[number];

/** Legacy API/body values → DB enum */
export function normalizeOrgRoleInput(raw: string): OrgRole | null {
  const s = raw.trim().toLowerCase();
  if (ORG_MEMBERSHIP_ROLES.includes(s as OrgRole)) return s as OrgRole;
  if (s === "org_admin") return "org_owner";
  if (s === "staff") return "victim_advocate";
  return null;
}

/** DB roles treated as receiving-side leadership (referral review grants, join approvers, etc.). */
export const ORG_LEADERSHIP_ROLES: OrgRole[] = [
  "org_owner",
  "program_manager",
  "supervisor",
];

/** DB roles with owner-tier management powers (invites, member role changes) — both map to simple `owner`. */
export const ORG_MANAGEMENT_ROLES: OrgRole[] = ["org_owner", "program_manager"];

/**
 * Staff roles for self-serve org invites and advocate join approvals (same set).
 * Excludes owner-tier DB roles — those come from claim/admin/onboarding, not these flows.
 */
export const ORG_SELF_SERVE_INVITE_ROLES: OrgRole[] = [
  "supervisor",
  "victim_advocate",
  "intake_specialist",
];

/** DB roles that cannot be assigned via POST /api/org/members/role without platform admin. */
export const ORG_OWNER_TIER_DB_ROLES: OrgRole[] = ["org_owner", "program_manager"];

/** Phase 1: supports normalized roles (owner/supervisor/advocate) and legacy DB enum strings. */
export function isOrgLeadership(r: OrgRole | string | null): boolean {
  if (!r) return false;
  if (r === "owner" || r === "supervisor") return true;
  return ORG_LEADERSHIP_ROLES.includes(r as OrgRole);
}

export function isOrgManagement(r: OrgRole | string | null): boolean {
  if (!r) return false;
  if (r === "owner") return true;
  return ORG_MANAGEMENT_ROLES.includes(r as OrgRole);
}

/**
 * Case/document work for org-scoped lists (excludes `auditor` — intentional; auditors are not full case staff).
 * Maps to simple Advocate for victim_advocate + intake_specialist; auditor still maps to simple advocate in auth
 * but is omitted here for sensitive operations.
 */
export const ORG_CASE_STAFF_ROLES: OrgRole[] = [
  "org_owner",
  "program_manager",
  "supervisor",
  "victim_advocate",
  "intake_specialist",
];

export function isOrgCaseStaff(r: OrgRole | null): boolean {
  return r !== null && ORG_CASE_STAFF_ROLES.includes(r);
}
