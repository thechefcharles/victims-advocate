"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const DRAFT_KEY_PREFIX = "nxtstps_compensation_intake_v1_";

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const id = session.user.id;
      const em = session.user.email ?? null;

      setUserId(id);
      setEmail(em);

      const key = `${DRAFT_KEY_PREFIX}${id}`;
      setHasDraft(!!localStorage.getItem(key));

      setLoading(false);
    };

    run();
  }, [router]);

  const handleStartFresh = () => {
    if (!userId) return;

    const key = `${DRAFT_KEY_PREFIX}${userId}`;
    localStorage.removeItem(key);

    setHasDraft(false);
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
            {hasDraft
              ? "You have a saved draft. You can continue where you left off or start over."
              : "You haven’t started an application yet."}
          </p>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/compensation/intake"
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                hasDraft
                  ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/25"
                  : "bg-[#1C8C8C] text-slate-950 hover:bg-[#21a3a3]"
              }`}
            >
              {hasDraft ? "Resume application" : "Start application"}
            </Link>

            {hasDraft && (
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
          You can safely leave at any time. Your draft is only saved to your
          account.
        </p>
      </div>
    </main>
  );
}