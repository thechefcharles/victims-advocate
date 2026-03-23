"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { AdvocateClientsList } from "@/components/dashboard/AdvocateClientsList";
import { ROUTES } from "@/lib/routes/pageRegistry";

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
      <main className="min-h-screen bg-slate-950 text-slate-300 px-6 py-10">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-300 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <Link
            href={ROUTES.advocateHome}
            className="text-slate-400 hover:text-white font-medium"
          >
            ← My Dashboard
          </Link>
        </div>

        <header>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 mb-1">
            Advocate workspace
          </p>
          <h1 className="text-2xl font-semibold text-white">My clients</h1>
        </header>

        <AdvocateClientsList email={user.email ?? null} token={accessToken} />
      </div>
    </main>
  );
}
