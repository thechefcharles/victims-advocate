"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDashboardPath } from "@/lib/dashboardRoutes";

/**
 * Layout guard for `/organization/settings` (org profile, members, designation, etc.).
 *
 * Phase 1 (route/layout): allow platform admins (e.g. `?organization_id=` from admin tools) and
 * users with an active org whose **simple org role** is owner or supervisor — **without** requiring
 * `profiles.role === "advocate"`. Advocate staff without leadership still use `/advocate/org`.
 *
 * Phase 2: tighten toward full membership-based authorization; keep profile role out of this gate.
 */
export default function RequireOrgWorkspaceAccess({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user, isAdmin, role, orgId, orgRole } = useAuth();

  const leadershipOk =
    Boolean(orgId) && (orgRole === "owner" || orgRole === "supervisor");
  const allowed = Boolean(isAdmin) || leadershipOk;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allowed) {
      router.replace(getDashboardPath({ isAdmin: false, orgId, orgRole, role }));
    }
  }, [loading, user, allowed, orgId, orgRole, role, router]);

  if (loading || !user || !allowed) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}
