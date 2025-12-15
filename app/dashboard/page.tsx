"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const ACTIVE_CASE_KEY_PREFIX = "nxtstps_active_case_";

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const readActiveCase = (id: string | null) => {
    if (!id) return null;
    return localStorage.getItem(`${ACTIVE_CASE_KEY_PREFIX}${id}`);
  };

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const id = session.user.id;
      const em = session.user.email ?? null;

      if (!mounted) return;

      setUserId(id);
      setEmail(em);
      setActiveCaseId(readActiveCase(id));
      setLoading(false);
    };

    run();

    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith(ACTIVE_CASE_KEY_PREFIX)) return;

      const currentUserId = userId;
      if (!currentUserId) return;

      const expectedKey = `${ACTIVE_CASE_KEY_PREFIX}${currentUserId}`;
      if (e.key === expectedKey) {
        setActiveCaseId(readActiveCase(currentUserId));
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, userId]);

  const handleStartFresh = () => {
    if (!userId) return;

    localStorage.removeItem(`${ACTIVE_CASE_KEY_PREFIX}${userId}`);
    setActiveCaseId(null);

    // This will trigger Intake auto-create case on load
    router.push("/compensation/intake");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto">Loading…</div>
      </main>
    );
  }

  const resumeHref = activeCaseId
    ? `/compensation/intake?case=${activeCaseId}`
    : "/compensation/intake";

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-xl mx-auto space-y-6">
        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            Your account
          </p>
          <h1 className="text-2xl font-semibold">Welcome</h1>
          <p className="text-sm text-slate-300">
            Signed in as <span className="font-medium">{email}</span>
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Your application
          </h2>

          <p className="text-[11px] text-slate-400">
            {activeCaseId
              ? "You have an in-progress application. You can resume or start fresh."
              : "You haven’t started an application yet."}
          </p>

          <div className="flex flex-wrap gap-2">
            <Link
              href={resumeHref}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                activeCaseId
                  ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/25"
                  : "bg-[#1C8C8C] text-slate-950 hover:bg-[#21a3a3]"
              }`}
            >
              {activeCaseId ? "Resume application" : "Start application"}
            </Link>

            {activeCaseId && (
              <button
                type="button"
                onClick={handleStartFresh}
                className="rounded-full border border-slate-600 px-4 py-2 text-xs hover:bg-slate-900/60"
              >
                Start fresh
              </button>
            )}
          </div>
        </section>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <Link href="/" className="hover:text-slate-200">
            ← Back to home
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="hover:text-slate-200"
          >
            Log out
          </button>
        </div>

        <p className="text-[11px] text-slate-500 pt-4">
          Your application is saved to your account. You can safely leave and
          come back later.
        </p>
      </div>
    </main>
  );
}