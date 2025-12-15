"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function TopNav() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      setAuthed(!!session);

      if (session?.user?.id) {
        const key = `nxtstps_compensation_intake_v1_${session.user.id}`;
        setHasDraft(!!localStorage.getItem(key));
      } else {
        setHasDraft(false);
      }
    };

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);

      if (session?.user?.id) {
        const key = `nxtstps_compensation_intake_v1_${session.user.id}`;
        setHasDraft(!!localStorage.getItem(key));
      } else {
        setHasDraft(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="border-b border-slate-800 bg-gradient-to-b from-[#0A2239] to-[#020b16]/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        {/* Left: Home */}
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

        {/* Right: actions */}
        <nav className="flex items-center gap-3 text-xs text-slate-200">
          {/* Primary CTA */}
          {authed ? (
            hasDraft ? (
              <Link
                href="/compensation/intake"
                className="rounded-full border border-emerald-500 bg-emerald-500/10 px-3 py-1.5 text-emerald-300 hover:bg-emerald-500/20"
              >
                Resume Draft
              </Link>
            ) : (
              <Link
                href="/compensation/intake"
                className="rounded-full border border-[#1C8C8C]/40 bg-[#1C8C8C]/10 px-3 py-1.5 font-medium hover:bg-[#1C8C8C]/20"
              >
                Start Application
              </Link>
            )
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-[#1C8C8C]/40 bg-[#1C8C8C]/10 px-3 py-1.5 font-medium hover:bg-[#1C8C8C]/20"
            >
              Start Application
            </Link>
          )}

          {/* Secondary actions */}
          {authed ? (
            <>
              <Link
                href="/advocate"
                className="rounded-full border border-slate-600 px-3 py-1.5 hover:bg-slate-900/60"
              >
                Advocate
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