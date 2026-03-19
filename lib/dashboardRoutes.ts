/**
 * Single place for "which home dashboard" after login and redirects.
 */

export type OrgRole = "staff" | "supervisor" | "org_admin" | null;

export type DashboardMe = {
  isAdmin?: boolean;
  orgId?: string | null;
  orgRole?: OrgRole;
  role?: "victim" | "advocate" | "organization";
};

/** Map /api/me role string to dashboard routing input. */
export function mapApiRoleToDashboard(
  role: unknown
): "victim" | "advocate" | "organization" {
  if (role === "advocate" || role === "organization") return role;
  return "victim";
}

/** Platform admin → /admin/dashboard; org leadership → /organization/dashboard; advocate → /advocate/dashboard; organization (no org yet) → /organization/setup; victim → /victim/dashboard */
export function getDashboardPath(me: DashboardMe): string {
  if (me.isAdmin === true) return "/admin/dashboard";
  if (
    me.orgId &&
    (me.orgRole === "org_admin" || me.orgRole === "supervisor")
  ) {
    return "/organization/dashboard";
  }
  if (me.role === "advocate") return "/advocate/dashboard";
  if (me.role === "organization") {
    if (!me.orgId) return "/organization/setup";
    return "/organization/dashboard";
  }
  return "/victim/dashboard";
}
