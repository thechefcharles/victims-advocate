// app/dashboard/page.tsx — routes everyone to the correct role dashboard
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDashboardPath } from "@/lib/dashboardRoutes";

export default function DashboardRouterPage() {
  const router = useRouter();
  const {
    loading,
    user,
    accessToken,
    emailVerified,
    accountStatus,
    isAdmin,
    role,
    orgId,
    orgRole,
  } = useAuth();
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!emailVerified) {
      router.replace("/verify-email");
      return;
    }
    if (accountStatus !== "active") {
      router.replace("/account-disabled");
      return;
    }
  }, [loading, user, emailVerified, accountStatus, router]);

  useEffect(() => {
    if (loading || !user || !accessToken || consentChecked) return;

    const check = async () => {
      const res = await fetch("/api/policies/active", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        setConsentChecked(true);
        return;
      }
      const json = await res.json();
      const missing = (json.data?.missing_doc_types ?? []) as string[];
      const needsTermsOrPrivacy =
        missing.includes("terms_of_use") || missing.includes("privacy_policy");
      setConsentChecked(true);
      if (needsTermsOrPrivacy) {
        router.replace("/consent?redirect=/dashboard");
        return;
      }
    };

    check();
  }, [loading, user, accessToken, consentChecked, router]);

  useEffect(() => {
    if (loading || !user || !consentChecked || !emailVerified || accountStatus !== "active") return;
    const path = getDashboardPath({ isAdmin, orgId, orgRole, role });
    if (path !== "/dashboard") {
      router.replace(path);
    }
  }, [loading, user, consentChecked, emailVerified, accountStatus, isAdmin, orgId, orgRole, role, router]);

  if (loading || !consentChecked) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-6 py-10">
        <div className="max-w-xl mx-auto">Loading…</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-6 py-10">
        <div className="max-w-xl mx-auto text-[11px] text-[var(--color-muted)]">Redirecting…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-6 py-10">
      <div className="max-w-xl mx-auto text-sm text-[var(--color-muted)]">Redirecting to your dashboard…</div>
    </main>
  );
}
