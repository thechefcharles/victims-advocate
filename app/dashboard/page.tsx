// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import VictimDashboard from "@/components/dashboard/VictimDashboard";
import AdvocateDashboard from "@/components/dashboard/AdvocateDashboard";

export default function DashboardPage() {
  const router = useRouter();
  const { loading, user, role, accessToken, emailVerified, accountStatus } = useAuth();
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
      }
    };

    check();
  }, [loading, user, accessToken, consentChecked, router]);

  if (loading || !consentChecked) {
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