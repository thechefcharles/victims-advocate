"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConsentRedirect } from "@/components/auth/useConsentRedirect";
import { CaseMessagesPanel } from "@/components/messaging/CaseMessagesPanel";
import { ROUTES } from "@/lib/routes/pageRegistry";
import { useI18n } from "@/components/i18n/i18nProvider";

type CaseRow = {
  id: string;
  name?: string | null;
  created_at?: string;
  application?: unknown;
  access?: { role?: string };
};

function caseLabel(c: CaseRow): string {
  if (c.name?.trim()) return c.name.trim();
  const app = c.application as { victim?: { firstName?: string; lastName?: string } } | undefined;
  const first = (app?.victim?.firstName ?? "").trim();
  const last = (app?.victim?.lastName ?? "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  return `Case ${c.id.slice(0, 8)}…`;
}

function VictimMessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { accessToken, role } = useAuth();

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const caseParam = searchParams.get("case")?.trim() ?? "";

  const loadCases = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setCases([]);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/compensation/cases", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        setErr(t("victimMessages.loadError"));
        setCases([]);
        return;
      }
      const json = await res.json();
      const rows = (json.cases ?? []) as CaseRow[];
      setCases(rows.filter((c) => c.access?.role === "owner"));
    } catch (e) {
      console.error(e);
      setErr(t("victimMessages.loadError"));
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, t]);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  useEffect(() => {
    if (role && role !== "victim") {
      router.replace(ROUTES.dashboard);
    }
  }, [role, router]);

  const validIds = useMemo(() => new Set(cases.map((c) => c.id)), [cases]);

  useEffect(() => {
    if (loading || cases.length === 0) return;
    if (!caseParam || !validIds.has(caseParam)) {
      router.replace(`${ROUTES.victimMessages}?case=${encodeURIComponent(cases[0].id)}`);
    }
  }, [loading, cases, caseParam, validIds, router]);

  const activeCaseId = useMemo(() => {
    if (caseParam && validIds.has(caseParam)) return caseParam;
    return cases[0]?.id ?? null;
  }, [caseParam, validIds, cases]);

  const selectCase = (id: string) => {
    router.push(`${ROUTES.victimMessages}?case=${encodeURIComponent(id)}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <Link
            href={ROUTES.victimDashboard}
            className="text-xs text-slate-400 hover:text-slate-200 mb-1 inline-block"
          >
            ← {t("victimMessages.backDashboard")}
          </Link>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            {t("victimMessages.eyebrow")}
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">{t("victimMessages.title")}</h1>
          <p className="text-sm text-slate-400 max-w-xl">{t("victimMessages.subtitle")}</p>
        </header>

        {loading ? (
          <p className="text-sm text-slate-400">{t("common.loading")}</p>
        ) : err ? (
          <div className="rounded-2xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        ) : cases.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-8 text-center space-y-3">
            <p className="text-sm text-slate-300">{t("victimMessages.noCases")}</p>
            <Link
              href={ROUTES.compensationIntake}
              className="inline-flex rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              {t("victimMessages.startApplication")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_1fr] items-start">
            <nav
              className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 space-y-1"
              aria-label={t("victimMessages.casePickerLabel")}
            >
              <p className="text-[10px] uppercase tracking-wide text-slate-500 px-2 pb-2">
                {t("victimMessages.yourCases")}
              </p>
              {cases.map((c) => {
                const active = c.id === activeCaseId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCase(c.id)}
                    className={`w-full text-left rounded-xl px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-blue-600/25 border border-blue-500/40 text-white"
                        : "border border-transparent text-slate-300 hover:bg-slate-900/80"
                    }`}
                  >
                    <span className="block font-medium truncate">{caseLabel(c)}</span>
                    {c.created_at && (
                      <span className="text-[10px] text-slate-500">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="min-w-0">
              {activeCaseId ? (
                <CaseMessagesPanel
                  caseId={activeCaseId}
                  headingTitle={t("victimMessages.threadHeading")}
                  headingSubtitle={t("victimMessages.threadSubtitle")}
                  emptyStateText={t("victimMessages.threadEmpty")}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function VictimMessagesPage() {
  const { accessToken } = useAuth();
  const consentReady = useConsentRedirect(accessToken, ROUTES.victimMessages);

  if (!consentReady) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto text-sm text-slate-400">Loading…</div>
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10">
          <div className="max-w-xl mx-auto text-sm text-slate-400">Loading…</div>
        </main>
      }
    >
      <VictimMessagesContent />
    </Suspense>
  );
}
