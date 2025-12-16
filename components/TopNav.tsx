// components/TopNav.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";

export default function TopNav() {
  const router = useRouter();
  const { loading, user, role } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const dashboardLabel = role === "advocate" ? "My clients" : "My cases";

  return (
    <header className="border-b border-slate-800 bg-gradient-to-b from-[#0A2239] to-[#020b16]/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-[#1C8C8C] flex items-center justify-center text-xs font-bold tracking-wide text-slate-950">
            N
          </div>
          <div className="text-sm">
            <div className="font-semibold tracking-[0.14em] uppercase text-slate-200">
              NxtStps
            </div>
            <div className="text-[11px] text-slate-400">
              Victim Support · Made Simple
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-3 text-xs text-slate-200">
          {loading ? (
            <span className="text-[11px] text-slate-400">Loading…</span>
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-full border border-slate-600 px-3 py-1.5 hover:bg-slate-900/60"
              >
                {dashboardLabel}
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-slate-600 px-3 py-1.5 hover:bg-slate-900/60"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-slate-600 px-3 py-1.5 hover:bg-slate-900/60"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}