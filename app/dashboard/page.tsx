// app/dashboard/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const ACTIVE_CASE_KEY_PREFIX = "nxtstps_active_case_";
const PROGRESS_KEY_PREFIX = "nxtstps_intake_progress_";

type UserRole = "victim" | "advocate";

type CaseRow = {
  id: string;
  created_at?: string;
  status?: string;
  state_code?: string;
  application?: any;
  access?: { role?: "owner" | "advocate"; can_view?: boolean; can_edit?: boolean };
};

type ClientRow = {
  client_user_id: string;
  latest_case_id: string;
  latest_case_created_at: string;
  case_count: number;
  display_name: string;
};

function safeJsonParse<T>(raw: any): T | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as T;
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

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
  } catch {
    // ignore
  }
}
function safeRemoveItem(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>("victim");

  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [bootLoading, setBootLoading] = useState(true);

  const readActiveCase = (uid: string) => safeGetItem(`${ACTIVE_CASE_KEY_PREFIX}${uid}`);

  const clearPointers = (uid: string) => {
    safeRemoveItem(`${ACTIVE_CASE_KEY_PREFIX}${uid}`);
    safeRemoveItem(`${PROGRESS_KEY_PREFIX}${uid}`);
  };

  const refetch = useCallback(async (uid: string, userRole: UserRole) => {
    setListLoading(true);
    setListError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Missing auth token");

      if (userRole === "advocate") {
        const res = await fetch("/api/advocate/clients", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();

        setClients((json.clients ?? []) as ClientRow[]);
        setCases([]);
        return;
      }

      // victim
      const res = await fetch("/api/compensation/cases", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();

      const rows = (json.cases ?? []) as CaseRow[];

      // ✅ IMPORTANT: victim sees ONLY owner rows
      setCases(rows.filter((c) => c.access?.role === "owner"));
      setClients([]);
    } catch (e) {
      console.error("Dashboard fetch failed:", e);
      setListError("Couldn’t load this page. Please try again.");
    } finally {
      setListLoading(false);
    }
  }, []);

  // bootstrap session + role
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const uid = session.user.id;
      const em = session.user.email ?? null;

      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle();

      const userRole: UserRole = prof?.role === "advocate" ? "advocate" : "victim";

      if (!mounted) return;

      setUserId(uid);
      setEmail(em);
      setRole(userRole);
      setActiveCaseId(readActiveCase(uid));

      setBootLoading(false);
      await refetch(uid, userRole);
    };

    run();

    return () => {
      mounted = false;
    };
  }, [router, refetch]);

  // keep active case pointer updated across tabs (victim only really uses it)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!userId) return;
      const expectedKey = `${ACTIVE_CASE_KEY_PREFIX}${userId}`;
      if (e.key === expectedKey) {
        setActiveCaseId(readActiveCase(userId));
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  const handleStartNew = () => {
    if (!userId) return;
    if (role !== "victim") return;

    clearPointers(userId);
    setActiveCaseId(null);

    router.push("/compensation/intake"); // intake auto-creates draft
  };

  const handleOpenCase = (caseIdToOpen: string) => {
    if (!userId) return;

    // advocates can open shared cases too, but we should NOT write progress/start-new UI for them
    safeSetItem(`${ACTIVE_CASE_KEY_PREFIX}${userId}`, caseIdToOpen);
    setActiveCaseId(caseIdToOpen);

    // keep progress aligned for victims only (homepage progress bar)
    if (role === "victim") {
      try {
        const progKey = `${PROGRESS_KEY_PREFIX}${userId}`;
        const raw = safeGetItem(progKey);
        const parsed = raw ? JSON.parse(raw) : {};
        safeSetItem(
          progKey,
          JSON.stringify({ ...(parsed ?? {}), caseId: caseIdToOpen, updatedAt: Date.now() })
        );
      } catch {
        // ignore
      }
    }

    router.push(`/compensation/intake?case=${caseIdToOpen}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const pageTitle = role === "advocate" ? "My clients" : "My cases";

  const resumeHref = useMemo(() => {
    // victims: resume intake
    return activeCaseId
      ? `/compensation/intake?case=${activeCaseId}`
      : "/compensation/intake";
  }, [activeCaseId]);

  if (bootLoading) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            {pageTitle}
          </p>
          <h1 className="text-2xl font-semibold">Welcome</h1>
          <p className="text-sm text-slate-300">
            Signed in as <span className="font-medium">{email}</span>
          </p>
        </header>

        {/* Quick actions */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-100">Quick actions</h2>

          {role === "advocate" ? (
            <p className="text-[11px] text-slate-400">
              Clients appear when a victim shares a case with you. Click a client below to view shared cases.
            </p>
          ) : (
            <p className="text-[11px] text-slate-400">
              {activeCaseId
                ? "Resume your in-progress case, or start a new case anytime."
                : "Start a new case to begin an application."}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {role === "advocate" ? (
              <>
                <button
                  type="button"
                  onClick={() => userId && refetch(userId, role)}
                  disabled={listLoading || !userId}
                  className="rounded-full px-4 py-2 text-xs font-semibold bg-[#1C8C8C] text-slate-950 hover:bg-[#21a3a3] disabled:opacity-60"
                >
                  {listLoading ? "Refreshing…" : "Refresh clients"}
                </button>

                <Link
                  href="/knowledge/compensation"
                  className="rounded-full border border-slate-600 px-4 py-2 text-xs hover:bg-slate-900/60"
                >
                  How invites work
                </Link>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </section>

        {/* Main list */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">
              {role === "advocate" ? "Your clients" : "Your cases"}
            </h2>

            <button
              type="button"
              onClick={() => userId && refetch(userId, role)}
              className="text-[11px] rounded-full border border-slate-700 px-3 py-1.5 hover:bg-slate-900/60"
              disabled={listLoading || !userId}
            >
              {listLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {listLoading ? (
            <p className="text-[11px] text-slate-400">Loading…</p>
          ) : listError ? (
            <p className="text-[11px] text-red-300">{listError}</p>
          ) : role === "advocate" ? (
            clients.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                No clients yet. Ask a victim to invite you to a case.
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
            )
          ) : cases.length === 0 ? (
            <p className="text-[11px] text-slate-400">
              No cases yet. Click “Start application” to create your first case.
            </p>
          ) : (
            <div className="grid gap-3">
              {cases.map((c) => {
                const created = c.created_at ? new Date(c.created_at).toLocaleString() : "—";
                const status = c.status ?? "draft";

                const app = safeJsonParse<any>(c.application) ?? {};
                const first = app?.victim?.firstName?.trim?.() ?? "";
                const last = app?.victim?.lastName?.trim?.() ?? "";
                const victimName = first || last ? `${first} ${last}`.trim() : null;

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
                          {victimName ? victimName : `Case ${c.id.slice(0, 8)}…`}
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

          <button type="button" onClick={handleLogout} className="hover:text-slate-200">
            Log out
          </button>
        </div>

        <p className="text-[11px] text-slate-500 pt-4">
          {role === "advocate"
            ? "Clients appear when someone shares a case with you."
            : "Your cases are saved to your account. You can safely leave and come back later."}
        </p>
      </div>
    </main>
  );
}