"use client";

import VictimDashboard from "@/components/dashboard/VictimDashboard";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConsentRedirect } from "@/components/auth/useConsentRedirect";

export default function VictimDashboardPage() {
  const { user, accessToken } = useAuth();
  const consentReady = useConsentRedirect(accessToken, "/victim/dashboard");

  if (!consentReady) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto text-sm text-slate-400">Loading…</div>
      </main>
    );
  }

  return (
    <VictimDashboard userId={user?.id ?? ""} token={accessToken} />
  );
}
