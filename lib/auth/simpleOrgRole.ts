/**
 * Phase 1: Product-facing org roles (maps from DB `org_membership_role` enum).
 * DB still stores full enum; we normalize at auth boundary for simple access rules.
 */

export const SIMPLE_ORG_ROLES = ["owner", "supervisor", "advocate"] as const;
export type SimpleOrgRole = (typeof SIMPLE_ORG_ROLES)[number];

/** For `requireOrgRole` — owner + supervisor (maps from org_owner/program_manager/supervisor). */
export const SIMPLE_ORG_LEADERSHIP_ROLES = ["owner", "supervisor"] as const;
/** Owner-only management APIs (maps from org_owner/program_manager). */
export const SIMPLE_ORG_MANAGEMENT_ROLES = ["owner"] as const;
/** Anyone who can work org cases (all simple roles). */
export const SIMPLE_ORG_CASE_STAFF_ROLES = ["owner", "supervisor", "advocate"] as const;

/** Map DB enum → owner | supervisor | advocate (conservative; unused roles → advocate). */
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
