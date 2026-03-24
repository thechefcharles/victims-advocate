/**
 * Single place for "which home dashboard" after login and redirects.
 */

import type { SimpleOrgRole } from "@/lib/auth/simpleOrgRole";

export type DashboardMe = {
  isAdmin?: boolean;
  orgId?: string | null;
  orgRole?: SimpleOrgRole | null;
  role?: "victim" | "advocate" | "organization";
};

/** Map /api/me role string to dashboard routing input. */
export function mapApiRoleToDashboard(
  role: unknown
): "victim" | "advocate" | "organization" {
  if (role === "advocate" || role === "organization") return role;
  return "victim";
}

/**
 * Role-first routing — profile `role` always wins.
 * (Victims may still have org-related fields for matching; they must never be sent to org dashboards.)
 *
 * Admin → /admin/dashboard · Victim → /victim/dashboard · Advocate → /advocate · Organization → setup or org dashboard
 */
export function getDashboardPath(me: DashboardMe): string {
  if (me.isAdmin === true) return "/admin/dashboard";
  if (me.role === "victim") return "/victim/dashboard";
  if (me.role === "advocate") return "/advocate";
  if (me.role === "organization") {
    if (!me.orgId) return "/organization/setup";
    return "/organization/dashboard";
  }
  return "/victim/dashboard";
}

/** Short label for public-page “go to workspace” buttons (Phase 7). */
export function getWorkspaceCtaLabel(me: DashboardMe): string {
  if (me.isAdmin === true) return "Go to Admin Home";
  if (me.role === "victim") return "My dashboard";
  if (me.role === "advocate") return "Go to My Dashboard";
  if (me.role === "organization") {
    if (!me.orgId) return "Continue organization setup";
    return "Go to Organization Home";
  }
  return "My dashboard";
}
