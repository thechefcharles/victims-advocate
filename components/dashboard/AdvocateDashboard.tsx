// components/dashboard/AdvocateDashboard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ClientRow = {
  client_user_id: string;
  latest_case_id: string;
  latest_case_created_at: string;
  case_count: number;
  display_name: string;
};

export default function AdvocateDashboard({
  email,
  userId,
}: {
  email: string | null;
  userId: string | null;
}) {
  const router = useRouter();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setErr(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Missing auth token");

      const res = await fetch("/api/advocate/clients", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(await res.text());

      const json = await res.json();
      setClients((json.clients ?? []) as ClientRow[]);
    } catch (e) {
      console.error(e);
      setErr("Couldn’t load your clients. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            My clients
          </p>
          <h1 className="text-2xl font-semibold">Welcome</h1>
          <p className="text-sm text-slate-300">
            Signed in as <span className="font-medium">{email}</span>
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Your clients</h2>

            <button
              type="button"
              onClick={refetch}
              disabled={loading}
              className="text-[11px] rounded-full border border-slate-700 px-3 py-1.5 hover:bg-slate-900/60 disabled:opacity-60"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {loading ? (
            <p className="text-[11px] text-slate-400">Loading…</p>
          ) : err ? (
            <p className="text-[11px] text-red-300">{err}</p>
          ) : clients.length === 0 ? (
            <p className="text-[11px] text-slate-400">
              No clients yet. A victim must invite you to a case.
            </p>
          ) : (
            <div className="grid gap-3">
              {clients.map((c) => (
                <Link
                  key={c.client_user_id}
                  href={`/dashboard/clients/${c.client_user_id}`}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 hover:bg-slate-900/40 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-slate-100">
                        {c.display_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {c.case_count} case(s) • Latest:{" "}
                        {c.latest_case_created_at
                          ? new Date(c.latest_case_created_at).toLocaleString()
                          : "—"}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-300">Open →</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
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
      </div>
    </main>
  );
}