// components/dashboard/VictimDashboard.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/components/i18n/i18nProvider";
import { emptyCompensationApplication } from "@/lib/compensationSchema";

const ACTIVE_CASE_KEY_PREFIX = "nxtstps_active_case_";
const PROGRESS_KEY_PREFIX = "nxtstps_intake_progress_";

type EligibilityResult = "eligible" | "needs_review" | "not_eligible" | null;

type CaseRow = {
  id: string;
  name?: string | null;
  created_at?: string;
  status?: string;
  state_code?: string;
  application?: any;
  eligibility_result?: EligibilityResult;
  eligibility_readiness?: string | null;
  eligibility_completed_at?: string | null;
  access?: { role?: "owner" | "advocate"; can_view?: boolean; can_edit?: boolean };
};

function getCaseDisplayName(c: CaseRow): string {
  if (c.name?.trim()) return c.name.trim();
  const app = c.application;
  if (app?.victim?.firstName || app?.victim?.lastName) {
    const first = (app.victim.firstName ?? "").trim();
    const last = (app.victim.lastName ?? "").trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
  }
  return `Case ${c.id.slice(0, 8)}…`;
}

function getEligibilityStatusLabel(
  c: CaseRow,
  t: (key: string) => string
): string {
  if (!c.eligibility_result) return t("eligibility.status.notChecked");
  if (c.eligibility_result === "eligible") return t("eligibility.status.eligible");
  if (c.eligibility_result === "needs_review")
    return t("eligibility.status.needsReview");
  if (c.eligibility_result === "not_eligible")
    return t("eligibility.status.notEligible");
  return t("eligibility.status.notChecked");
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
  const { t } = useI18n();

  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [skipWarningCaseId, setSkipWarningCaseId] = useState<string | null>(null);
  const [creatingCase, setCreatingCase] = useState(false);

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

  const activeCase = useMemo(
    () => cases.find((c) => c.id === activeCaseId),
    [cases, activeCaseId]
  );
  const activeCaseDisplayName = activeCase ? getCaseDisplayName(activeCase) : null;

  const handleStartNew = async () => {
    if (!token) return;
    clearPointers(userId);
    setActiveCaseId(null);
    setCreatingCase(true);
    try {
      const res = await fetch("/api/compensation/cases", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          application: emptyCompensationApplication,
          name: null,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const json = await res.json();
      const newCase = json.case;
      if (newCase?.id) {
        refetch();
        router.push(`/compensation/eligibility/${newCase.id}`);
      } else {
        router.push("/compensation/intake");
      }
    } catch {
      router.push("/compensation/intake");
    } finally {
      setCreatingCase(false);
    }
  };

  const handleRunEligibility = (caseId: string) => {
    router.push(`/compensation/eligibility/${caseId}`);
  };

  const proceedToIntake = (caseIdToOpen: string) => {
    setSkipWarningCaseId(null);
    safeSetItem(`${ACTIVE_CASE_KEY_PREFIX}${userId}`, caseIdToOpen);
    setActiveCaseId(caseIdToOpen);

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

  const handleOpenCase = (caseIdToOpen: string, c: CaseRow) => {
    if (c.eligibility_result) {
      proceedToIntake(caseIdToOpen);
    } else {
      setSkipWarningCaseId(caseIdToOpen);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleSaveName = async (caseId: string, newName: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/compensation/cases/${caseId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName.trim() || null }),
      });
      if (res.ok) {
        setEditingNameId(null);
        refetch();
      }
    } catch {
      console.error("Failed to save case name");
    }
  };

  const handleDeleteCase = async (caseId: string, displayName: string) => {
    if (!confirm(`Delete "${displayName}"? This cannot be undone.`)) return;
    if (!token) return;
    try {
      const res = await fetch(`/api/compensation/cases/${caseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        if (activeCaseId === caseId) {
          clearPointers(userId);
          setActiveCaseId(null);
        }
        refetch();
      } else {
        alert("Could not delete case. Try again.");
      }
    } catch {
      alert("Could not delete case. Try again.");
    }
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
              ? "Run the eligibility check for your case, then start the intake form when ready."
              : "Start a new case to run the eligibility check and begin an application."}
          </p>

          <div className="flex flex-wrap gap-2">
            {activeCaseId && activeCase && (
              <>
                <button
                  type="button"
                  onClick={() => handleRunEligibility(activeCaseId)}
                  className="rounded-full bg-[#1C8C8C] px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-[#21a3a3]"
                >
                  {t("eligibility.dashboard.runCheck")}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCase(activeCaseId, activeCase)}
                  className="rounded-full border border-emerald-500/40 px-4 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15"
                >
                  {t("eligibility.dashboard.startIntake")}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleStartNew}
              disabled={creatingCase}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                activeCaseId && activeCase
                  ? "border border-slate-600 hover:bg-slate-900/60"
                  : "bg-[#1C8C8C] text-slate-950 hover:bg-[#21a3a3]"
              } disabled:opacity-50`}
            >
              {creatingCase ? "Creating…" : "Start new case"}
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
                const displayName = getCaseDisplayName(c);
                const isEditing = editingNameId === c.id;

                return (
                  <div
                    key={c.id}
                    className={`rounded-2xl border px-4 py-3 transition ${
                      isActive
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : "border-slate-800 bg-slate-950/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        {isEditing ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSaveName(c.id, editNameValue);
                            }}
                            className="flex gap-2"
                          >
                            <input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              placeholder="Case name"
                              className="flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-[#1C8C8C]"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="text-[11px] text-emerald-400 hover:text-emerald-300"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNameId(null);
                                setEditNameValue("");
                              }}
                              className="text-[11px] text-slate-400 hover:text-slate-300"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => handleOpenCase(c.id, c)}
                          >
                            <div className="text-xs font-semibold text-slate-100 truncate">
                              {displayName}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingNameId(c.id);
                                setEditNameValue(c.name?.trim() ?? "");
                              }}
                              className="text-[10px] text-slate-500 hover:text-slate-300 shrink-0"
                              title="Edit name"
                            >
                              Rename
                            </button>
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400">
                          Status: {status} • Eligibility:{" "}
                          {getEligibilityStatusLabel(c, t)} • Created: {created}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRunEligibility(c.id)}
                          className="text-[11px] text-[#1C8C8C] hover:text-[#21a3a3]"
                        >
                          {t("eligibility.dashboard.runCheck")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCase(c.id, c)}
                          className="text-[11px] text-slate-300 hover:text-slate-100"
                        >
                          {t("eligibility.dashboard.startIntake")} →
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCase(c.id, displayName)}
                          className="text-[11px] text-red-400 hover:text-red-300"
                          title="Delete case"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Skip eligibility warning modal */}
        {skipWarningCaseId && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setSkipWarningCaseId(null)}
          >
            <div
              className="rounded-2xl border border-slate-700 bg-slate-950 p-6 max-w-md space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold text-slate-100">
                {t("eligibility.dashboard.skipWarningTitle")}
              </h3>
              <p className="text-xs text-slate-300">
                {t("eligibility.dashboard.skipWarningBody")}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const c = cases.find((x) => x.id === skipWarningCaseId);
                    if (c) proceedToIntake(skipWarningCaseId);
                    setSkipWarningCaseId(null);
                  }}
                  className="rounded-full border border-slate-600 px-4 py-2 text-xs hover:bg-slate-900/60"
                >
                  {t("eligibility.dashboard.continueAnyway")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    router.push(`/compensation/eligibility/${skipWarningCaseId}`);
                    setSkipWarningCaseId(null);
                  }}
                  className="rounded-full bg-[#1C8C8C] px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-[#21a3a3]"
                >
                  {t("eligibility.dashboard.runCheckFirst")}
                </button>
              </div>
            </div>
          </div>
        )}

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