/**
 * Staff roles assignable in self-serve flows (invites, advocate join approval).
 * Owner-tier DB roles (`org_owner`, `program_manager`) are excluded — claim / admin / onboarding only.
 * Phase 4: single vocabulary with `ORG_SELF_SERVE_INVITE_ROLES` in `lib/server/auth/orgRoles.ts`.
 * Phase 5 may further narrow `profiles.role` vs membership for routing after join/invite.
 */

import type { OrgRole } from "@/lib/server/auth/orgRoles";
export { ORG_SELF_SERVE_INVITE_ROLES } from "@/lib/server/auth/orgRoles";

export function labelStaffAssignableOrgRole(role: OrgRole): string {
  switch (role) {
    case "supervisor":
      return "Supervisor";
    case "victim_advocate":
      return "Advocate";
    case "intake_specialist":
      return "Advocate (intake)";
    default:
      return role;
  }
}
