/**
 * ORG-1B: Organization membership roles (matches public.org_membership_role enum).
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

/** Can manage org invites, designation, join requests, most org admin APIs */
export const ORG_LEADERSHIP_ROLES: OrgRole[] = [
  "org_owner",
  "program_manager",
  "supervisor",
];

/** Org settings, membership revoke, role changes to managers (ORG-4 tightens further) */
export const ORG_MANAGEMENT_ROLES: OrgRole[] = ["org_owner", "program_manager"];

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

/** Case/document work (excludes auditor for sensitive lists) */
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
