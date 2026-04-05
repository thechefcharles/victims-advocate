"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDashboardPath } from "@/lib/dashboardRoutes";
import { hasActiveOrgLeadership } from "@/lib/auth/simpleOrgRole";

/**
 * `/organization/dashboard` — operational home for org leadership.
 * Phase 2: membership + simple org role (owner|supervisor), not `profiles.role === "organization"`.
 * Admins may open the page (e.g. support); APIs remain source of truth.
 */
export default function RequireOrgLeadership({ children }: { children: React.ReactNode }) {
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
      router.replace(
        getDashboardPath({ isAdmin: false, orgId, orgRole, role })
      );
    }
  }, [loading, user, allowed, orgId, orgRole, role, router]);

  if (loading || !user || !allowed) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}
