"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDashboardPath } from "@/lib/dashboardRoutes";
import { hasActiveOrgLeadership } from "@/lib/auth/simpleOrgRole";

/**
 * Layout guard for `/organization/settings` (org profile, members, designation, etc.).
 *
 * Membership-led: platform admins or `hasActiveOrgLeadership` (same bar as org dashboard).
 * Advocate staff without leadership still use `/advocate/org`. Profile `role` is not part of this gate.
 */
export default function RequireOrgWorkspaceAccess({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user, isAdmin, role, orgId, orgRole } = useAuth();

  const allowed = Boolean(isAdmin) || hasActiveOrgLeadership(orgId, orgRole);

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
