"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDashboardPath } from "@/lib/dashboardRoutes";

/** Platform admin only (`profiles.is_admin`). Others redirect to their dashboard. */
export default function RequirePlatformAdmin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user, isAdmin, role, orgId, orgRole } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace(
        getDashboardPath({ isAdmin: false, orgId, orgRole, role })
      );
    }
  }, [loading, user, isAdmin, orgId, orgRole, role, router]);

  if (loading || !user || !isAdmin) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}
