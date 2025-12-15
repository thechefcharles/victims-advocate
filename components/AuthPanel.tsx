"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const ACTIVE_CASE_KEY_PREFIX = "nxtstps_active_case_";

export default function AuthPanel() {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  const readActiveCase = (id: string | null) => {
    if (!id) return null;
    return localStorage.getItem(`${ACTIVE_CASE_KEY_PREFIX}${id}`);
  };

  useEffect(() => {
    let mounted = true;

    const syncFromSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      const id = session?.user?.id ?? null;
      const em = session?.user?.email ?? null;

      if (!mounted) return;

      setUserId(id);
      setEmail(em);
      setActiveCaseId(readActiveCase(id));
    };

    syncFromSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const id = session?.user?.id ?? null;
      const em = session?.user?.email ?? null;

      setUserId(id);
      setEmail(em);
      setActiveCaseId(readActiveCase(id));
    });

    const onStorage = (e: StorageEvent) => {
      // Only respond to our active case keys
      if (!e.key || !e.key.startsWith(ACTIVE_CASE_KEY_PREFIX)) return;

      // If this user is logged in, and their pointer changed, refresh it.
      // We can safely use localStorage read here.
      const currentUserId = userId; // state snapshot
      if (!currentUserId) return;

      const expectedKey = `${ACTIVE_CASE_KEY_PREFIX}${currentUserId}`;
      if (e.key === expectedKey) {
        setActiveCaseId(readActiveCase(currentUserId));
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const href = activeCaseId
    ? `/compensation/intake?case=${activeCaseId}`
    : "/compensation/intake";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 space-y-3">
      {userId ? (
        <>
          <div className="text-[11px] text-slate-400">Signed in as</div>
          <div className="text-sm font-semibold text-slate-100">{email}</div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href={href}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                activeCaseId
                  ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/25"
                  : "bg-[#1C8C8C] text-slate-950 hover:bg-[#21a3a3]"
              }`}
            >
              {activeCaseId ? "Resume application" : "Start application"}
            </Link>

            <Link
              href="/knowledge/compensation"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs hover:bg-slate-900/60"
            >
              Learn how it works
            </Link>
          </div>

          {activeCaseId && (
            <p className="text-[11px] text-slate-500">
              You have an in-progress application saved to your account.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="text-sm font-semibold text-slate-100">
            Start or resume your application
          </div>
          <div className="text-[11px] text-slate-400">
            You’ll be able to save progress and return later.
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/login"
              className="text-center rounded-lg bg-[#1C8C8C] px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-[#21a3a3]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-center rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-900/60"
            >
              Create account
            </Link>
          </div>

          <p className="text-[11px] text-slate-500 pt-2">
            Not legal advice. If you’re in immediate danger, call 911. If you
            need support now, call or text 988.
          </p>
        </>
      )}
    </div>
  );
}