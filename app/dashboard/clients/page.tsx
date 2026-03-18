"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { AdvocateClientsList } from "@/components/dashboard/AdvocateClientsList";

export default function AdvocateClientsPage() {
  const router = useRouter();
  const { loading, user, role, accessToken, emailVerified, accountStatus } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (role !== "advocate") {
      router.replace("/dashboard");
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
  }, [loading, user, role, emailVerified, accountStatus, router]);

  if (loading || !user || role !== "advocate") {
    return (
      <main className="min-h-screen bg-[#061e24] text-slate-50 px-6 py-10">
        <p className="text-sm text-teal-200/50">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#042a2e] via-[#061e24] to-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <Link
            href="/dashboard"
            className="text-teal-400/90 hover:text-teal-300 font-medium"
          >
            ← Advocate home
          </Link>
          <span className="text-teal-800">|</span>
          <Link href="/advocate" className="text-teal-200/50 hover:text-teal-200/80">
            Command center
          </Link>
        </div>

        <header>
          <p className="text-[11px] uppercase tracking-[0.25em] text-teal-400/80 mb-1">
            Advocate workspace
          </p>
          <h1 className="text-2xl font-semibold text-teal-50">My clients</h1>
        </header>

        <AdvocateClientsList email={user.email ?? null} token={accessToken} />
      </div>
    </main>
  );
}
