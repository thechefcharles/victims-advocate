"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDashboardPath } from "@/lib/dashboardRoutes";

/**
 * `/organization/setup` — `profiles.role === "organization"` means **org-leader signup intent**, not org power.
 * Org authority comes from `org_memberships` + org role after onboarding. Phase 5: keep this gate here only.
 */
export default function RequireOrganizationAccount({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { loading, user, isAdmin, role, orgId, orgRole } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (isAdmin) {
      router.replace("/admin/dashboard");
      return;
    }
    if (role !== "organization") {
      router.replace(getDashboardPath({ isAdmin: false, orgId, orgRole, role }));
    }
  }, [loading, user, isAdmin, role, orgId, orgRole, router]);

  if (loading || !user || role !== "organization" || isAdmin) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}
