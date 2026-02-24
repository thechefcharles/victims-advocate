"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * Wraps admin routes. Requires auth + (isAdmin OR role advocate).
 * - Not logged in → redirect to /login
 * - Logged in but not admin/advocate → redirect to /coming-soon
 * Advocates can access admin/cases for "View all saved cases" / "Open your case dashboard".
 */
export default function RequireAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { loading, user, isAdmin, role } = useAuth();
  const canAccess = isAdmin || role === "advocate";

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!canAccess) {
      router.replace("/coming-soon");
    }
  }, [loading, user, canAccess, router]);

  if (loading || !user || !canAccess) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}
