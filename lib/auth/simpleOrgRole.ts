/**
 * Product-facing org model: **Owner · Supervisor · Advocate** (three simple roles).
 *
 * DB enum (`org_membership_role`) is richer; we normalize here and in API `AuthContext.orgRole`.
 *
 * Phase 3 mapping (intentional, no enum migration):
 * - `org_owner` → Owner (sole “record owner” for lifecycle; see `syncOrganizationLifecycleFromOwnership`)
 * - `program_manager` → Owner (same simple tier as org_owner for permissions & leadership tooling)
 * - `supervisor` → Supervisor
 * - `victim_advocate`, `intake_specialist`, `auditor` → Advocate for auth/simple checks
 *
 * **Exception:** `isOrgCaseStaff` (server `orgRoles.ts`) still excludes `auditor` from some
 * sensitive case lists — auditors are not treated as full case staff there.
 *
 * Phase 5: `profiles.role` is onboarding/default-home; org authorization uses this mapping + membership.
 *
 * See `docs/org-system-boundaries.md`.
 */

export const SIMPLE_ORG_ROLES = ["owner", "supervisor", "advocate"] as const;
export type SimpleOrgRole = (typeof SIMPLE_ORG_ROLES)[number];

/** Leadership: simple Owner or Supervisor (DB: org_owner, program_manager, supervisor). */
export const SIMPLE_ORG_LEADERSHIP_ROLES = ["owner", "supervisor"] as const;
/** Management-style APIs: simple Owner only (DB: org_owner and program_manager both map to owner). */
export const SIMPLE_ORG_MANAGEMENT_ROLES = ["owner"] as const;
/** Anyone who can work org cases (all simple roles). */
export const SIMPLE_ORG_CASE_STAFF_ROLES = ["owner", "supervisor", "advocate"] as const;

/** Map DB enum → owner | supervisor | advocate (`program_manager` → owner; specialist/auditor → advocate). */
export function mapDbOrgRoleToSimple(raw: string | null | undefined): SimpleOrgRole | null {
  if (!raw || typeof raw !== "string") return null;
  switch (raw.trim()) {
    case "org_owner":
    case "program_manager":
      return "owner";
    case "supervisor":
      return "supervisor";
    case "victim_advocate":
    case "intake_specialist":
    case "auditor":
      return "advocate";
    default:
      return null;
  }
}

export function isSimpleOrgRoleString(s: string): s is SimpleOrgRole {
  return (SIMPLE_ORG_ROLES as readonly string[]).includes(s);
}

/** Active org membership with owner|supervisor simple role (leadership tooling, not case-staff). */
export function hasActiveOrgLeadership(
  orgId: string | null | undefined,
  orgRole: SimpleOrgRole | null | undefined
): boolean {
  if (!orgId || !orgRole) return false;
  return (SIMPLE_ORG_LEADERSHIP_ROLES as readonly string[]).includes(orgRole);
}

/** User-visible role in org workspace lists (invite/member tables). */
export function dbOrgRoleProductLabel(dbRole: string | null | undefined): string {
  if (!dbRole || typeof dbRole !== "string") return "—";
  switch (dbRole.trim().toLowerCase()) {
    case "org_owner":
    case "program_manager":
      return "Owner";
    case "supervisor":
      return "Supervisor";
    case "victim_advocate":
    case "intake_specialist":
      return "Advocate";
    case "auditor":
      return "Advocate (audit)";
    default:
      return dbRole;
  }
}
