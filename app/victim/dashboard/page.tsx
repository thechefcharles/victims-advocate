"use client";

import VictimDashboard from "@/components/dashboard/VictimDashboard";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConsentRedirect } from "@/components/auth/useConsentRedirect";

export default function VictimDashboardPage() {
  const { user, accessToken, loading: authLoading, legalConsentNextPath } = useAuth();
  const consentReady = useConsentRedirect(
    accessToken,
    "/victim/dashboard",
    authLoading,
    legalConsentNextPath
  );

  if (!consentReady) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-6 py-10">
        <div className="max-w-xl mx-auto text-sm text-[var(--color-muted)]">Loading…</div>
      </main>
    );
  }

  return (
    <VictimDashboard userId={user?.id ?? ""} token={accessToken} />
  );
}
