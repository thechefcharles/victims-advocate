"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDashboardPath } from "@/lib/dashboardRoutes";

/** Org admin or supervisor with an active org. */
export default function RequireOrgLeadership({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user, isAdmin, role, orgId, orgRole } = useAuth();
  const allowed =
    role === "organization" &&
    !!orgId &&
    (orgRole === "org_admin" || orgRole === "supervisor");

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
    if (!allowed) {
      router.replace(
        getDashboardPath({ isAdmin: false, orgId, orgRole, role })
      );
    }
  }, [loading, user, isAdmin, allowed, orgId, orgRole, role, router]);

  if (loading || !user || !allowed) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}
