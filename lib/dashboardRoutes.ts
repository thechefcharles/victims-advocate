/**
 * Single place for "which home dashboard" after login and redirects.
 *
 * Phase 5: `profiles.role` is primarily **onboarding + default home** (victim | advocate | organization).
 * Org *authorization* uses membership + `orgRole` (see RequireOrgLeadership, RequireOrgWorkspaceAccess).
 */

import type { SimpleOrgRole } from "@/lib/auth/simpleOrgRole";
import { hasActiveOrgLeadership } from "@/lib/auth/simpleOrgRole";

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
 * Role-first routing — profile `role` always wins for default *home*.
 * (Victims may still have org-related fields for matching; they must never be sent to org dashboards.)
 *
 * Admin → /admin/dashboard · Victim → /victim/dashboard · Advocate → /advocate · Organization → setup,
 * org leadership dashboard, or `/account` for org-profile staff without leadership (avoids /organization/dashboard redirect loop).
 */
export function getDashboardPath(me: DashboardMe): string {
  if (me.isAdmin === true) return "/admin/dashboard";
  if (me.role === "victim") return "/victim/dashboard";
  if (me.role === "advocate") return "/advocate";
  if (me.role === "organization") {
    if (!me.orgId) return "/organization/setup";
    if (hasActiveOrgLeadership(me.orgId, me.orgRole)) return "/organization/dashboard";
    return "/account";
  }
  return "/victim/dashboard";
}

/** Short label for public-page “go to workspace” buttons (Phase 7). */
export function getWorkspaceCtaLabel(me: DashboardMe): string {
  if (me.isAdmin === true) return "Go to Admin Home";
  if (me.role === "victim") return "My dashboard";
  if (me.role === "advocate") return "Go to My Dashboard";
  if (me.role === "organization") {
    if (!me.orgId) return "Set Up Organization Access";
    if (hasActiveOrgLeadership(me.orgId, me.orgRole)) return "Go to Organization Home";
    return "My account";
  }
  return "My dashboard";
}
