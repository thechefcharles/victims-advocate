// app/dashboard/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import VictimDashboard from "@/components/dashboard/VictimDashboard";
import AdvocateDashboard from "@/components/dashboard/AdvocateDashboard";

export default function DashboardPage() {
  const router = useRouter();
  const { loading, user, role, accessToken } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [loading, user, router]);

  // 1) still booting auth
  if (loading) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto">Loading…</div>
      </main>
    );
  }

  // 2) boot complete but not authed → show redirect state (don’t return null)
  if (!user) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto text-[11px] text-slate-400">
          Redirecting to login…
        </div>
      </main>
    );
  }

  const email = user.email ?? null;
  const token = accessToken ?? null; // keep explicit

  return role === "advocate" ? (
    <AdvocateDashboard email={email} userId={user.id} token={token} />
  ) : (
    <VictimDashboard email={email} userId={user.id} token={token} />
  );
}