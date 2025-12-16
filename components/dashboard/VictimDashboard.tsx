// components/dashboard/VictimDashboard.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const ACTIVE_CASE_KEY_PREFIX = "nxtstps_active_case_";
const PROGRESS_KEY_PREFIX = "nxtstps_intake_progress_";

type CaseRow = {
  id: string;
  created_at?: string;
  status?: string;
  state_code?: string;
  application?: any;
  access?: { role?: "owner" | "advocate"; can_view?: boolean; can_edit?: boolean };
};

function safeGetItem(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
function safeRemoveItem(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export default function VictimDashboard({
  email,
  userId,
  token,
}: {
  email: string | null;
  userId: string;
  token: string | null;
}) {
  const router = useRouter();

  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const readActiveCase = useCallback(
    (uid: string) => safeGetItem(`${ACTIVE_CASE_KEY_PREFIX}${uid}`),
    []
  );

  const clearPointers = useCallback((uid: string) => {
    safeRemoveItem(`${ACTIVE_CASE_KEY_PREFIX}${uid}`);
    safeRemoveItem(`${PROGRESS_KEY_PREFIX}${uid}`);
  }, []);

  const refetch = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setCases([]);
      setErr("Session expired. Please log in again.");
      router.replace("/login");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/compensation/cases", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(await res.text());

      const json = await res.json();
      const rows = (json.cases ?? []) as CaseRow[];

      // ✅ Victim sees ONLY owner rows
      setCases(rows.filter((c) => c.access?.role === "owner"));
    } catch (e) {
      console.error(e);
      setErr("Couldn’t load your cases. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  // init active case + fetch
  useEffect(() => {
    setActiveCaseId(readActiveCase(userId));
    refetch();
  }, [userId, readActiveCase, refetch]);

  // keep active pointer synced across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      const key = `${ACTIVE_CASE_KEY_PREFIX}${userId}`;
      if (e.key === key) setActiveCaseId(readActiveCase(userId));
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId, readActiveCase]);

  const resumeHref = useMemo(() => {
    return activeCaseId
      ? `/compensation/intake?case=${activeCaseId}`
      : "/compensation/intake";
  }, [activeCaseId]);

  const handleStartNew = () => {
    clearPointers(userId);
    setActiveCaseId(null);
    router.push("/compensation/intake");
  };

  const handleOpenCase = (caseIdToOpen: string) => {
    safeSetItem(`${ACTIVE_CASE_KEY_PREFIX}${userId}`, caseIdToOpen);
    setActiveCaseId(caseIdToOpen);

    // keep progress pointer aligned
    try {
      const progKey = `${PROGRESS_KEY_PREFIX}${userId}`;
      const raw = safeGetItem(progKey);
      const parsed = raw ? JSON.parse(raw) : {};
      safeSetItem(
        progKey,
        JSON.stringify({
          ...(parsed ?? {}),
          caseId: caseIdToOpen,
          updatedAt: Date.now(),
        })
      );
    } catch {}

    router.push(`/compensation/intake?case=${caseIdToOpen}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            My cases
          </p>
          <h1 className="text-2xl font-semibold">Welcome</h1>
          <p className="text-sm text-slate-300">
            Signed in as <span className="font-medium">{email}</span>
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-100">Quick actions</h2>

          <p className="text-[11px] text-slate-400">
            {activeCaseId
              ? "Resume your in-progress case, or start a new case anytime."
              : "Start a new case to begin an application."}
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

            <button
              type="button"
              onClick={handleStartNew}
              className="rounded-full border border-slate-600 px-4 py-2 text-xs hover:bg-slate-900/60"
            >
              Start new case
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Your cases</h2>
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
          ) : cases.length === 0 ? (
            <p className="text-[11px] text-slate-400">
              No cases yet. Click “Start application” to create your first case.
            </p>
          ) : (
            <div className="grid gap-3">
              {cases.map((c) => {
                const created = c.created_at
                  ? new Date(c.created_at).toLocaleString()
                  : "—";
                const status = c.status ?? "draft";
                const isActive = activeCaseId === c.id;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleOpenCase(c.id)}
                    className={`text-left rounded-2xl border px-4 py-3 transition ${
                      isActive
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : "border-slate-800 bg-slate-950/40 hover:bg-slate-900/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-slate-100">
                          Case {c.id.slice(0, 8)}…
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Status: {status} • Created: {created}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-300">Open →</div>
                    </div>
                  </button>
                );
              })}
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