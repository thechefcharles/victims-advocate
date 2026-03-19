/**
 * Single place for "which home dashboard" after login and redirects.
 */

export type OrgRole = "staff" | "supervisor" | "org_admin" | null;

export type DashboardMe = {
  isAdmin?: boolean;
  orgId?: string | null;
  orgRole?: OrgRole;
  role?: "victim" | "advocate";
};

/** Platform admin → /admin/dashboard; org leadership → /organization/dashboard; advocate → /advocate/dashboard; victim → /victim/dashboard */
export function getDashboardPath(me: DashboardMe): string {
  if (me.isAdmin === true) return "/admin/dashboard";
  if (
    me.orgId &&
    (me.orgRole === "org_admin" || me.orgRole === "supervisor")
  ) {
    return "/organization/dashboard";
  }
  if (me.role === "advocate") return "/advocate/dashboard";
  return "/victim/dashboard";
}
