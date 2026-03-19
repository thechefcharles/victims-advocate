"use client";

import AdvocateDashboard from "@/components/dashboard/AdvocateDashboard";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConsentRedirect } from "@/components/auth/useConsentRedirect";

export default function AdvocateDashboardPage() {
  const { user, accessToken } = useAuth();
  const consentReady = useConsentRedirect(accessToken, "/advocate/dashboard");

  if (!consentReady) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto text-sm text-slate-400">Loading…</div>
      </main>
    );
  }

  return (
    <AdvocateDashboard
      email={user?.email ?? null}
      userId={user?.id ?? ""}
      token={accessToken}
    />
  );
}
