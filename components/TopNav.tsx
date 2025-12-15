// components/TopNav.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProfileRole = "victim" | "advocate";

export default function TopNav() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<ProfileRole>("victim");

  const resolveRoleFromSession = (session: any): ProfileRole => {
    const metaRole = session?.user?.user_metadata?.role;
    return metaRole === "advocate" ? "advocate" : "victim";
  };

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      setCheckingAuth(true);

      // 1) fast path: session → render immediately
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (cancelled) return;

      setAuthed(!!session);
      setRole(resolveRoleFromSession(session));
      setCheckingAuth(false); // ✅ IMPORTANT: stop "Loading…" immediately

      // 2) optional background confirm from profiles (never block UI)
      const uid = session?.user?.id;
      if (!uid) return;

      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .maybeSingle();

        if (cancelled) return;

        if (prof?.role === "advocate") setRole("advocate");
        else if (prof?.role === "victim") setRole("victim");
      } catch {
        // ignore
      }
    };

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;

      // ✅ auth changes should also be instant
      setAuthed(!!session);
      setRole(resolveRoleFromSession(session));
      setCheckingAuth(false);

      // (optional) background confirm again
      const uid = session?.user?.id;
      if (!uid) return;

      supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle()
        .then(({ data: prof }) => {
          if (cancelled) return;
          if (prof?.role === "advocate") setRole("advocate");
          else if (prof?.role === "victim") setRole("victim");
        })
        .catch(() => {});
        // intentionally ignored — role already set from session metadata
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
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
          {checkingAuth ? (
            <span className="text-[11px] text-slate-400">Loading…</span>
          ) : authed ? (
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