"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConsentRedirect } from "@/components/auth/useConsentRedirect";
import { useI18n } from "@/components/i18n/i18nProvider";
import { ROUTES } from "@/lib/routes/pageRegistry";
import { hasActiveOrgLeadership } from "@/lib/auth/simpleOrgRole";
import { PageHeader } from "@/components/layout/PageHeader";
import { AdvocateClientsList } from "@/components/dashboard/AdvocateClientsList";
import { AdvocateProfileCompletionBanner } from "@/components/dashboard/AdvocateProfileCompletionBanner";
import { advocateWelcomeDisplayName } from "@/lib/personalInfo";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type CommandCenterCase = {
  id: string;
  victim_name: string;
  priority: "critical" | "high" | "medium" | "low";
  priority_reasons: string[];
  alert_count: number;
  completeness_blocking_count: number;
  unread_victim_message_count?: number;
};

type CommandCenterSummary = {
  active_case_count: number;
  high_priority_count: number;
  blocking_completeness_count: number;
};

type CommandCenterResponse = {
  summary: CommandCenterSummary;
  cases: CommandCenterCase[];
};

/** Advocate home at `/advocate` — client list → client cases → case (view/edit in intake). */
export default function AdvocateDashboardPage() {
  const { accessToken, orgId, orgRole, organizationName, user, advocatePersonalInfo } = useAuth();
  const showOrgLink = Boolean(orgId);
  const advocateOrgWorkspaceHref = hasActiveOrgLeadership(orgId, orgRole)
    ? ROUTES.organizationSettings
    : ROUTES.advocateOrg;
  const consentReady = useConsentRedirect(accessToken, "/advocate");
  const { t, tf } = useI18n();
  const [commandCenter, setCommandCenter] = useState<CommandCenterResponse | null>(null);
  const [ccLoading, setCcLoading] = useState(true);
  const [ccMsg, setCcMsg] = useState<string | null>(null);

  const welcomeName = advocateWelcomeDisplayName(advocatePersonalInfo);
  const dashboardTitle = welcomeName
    ? tf("advocateDashboard.welcomeTitle", { name: welcomeName })
    : t("advocateDashboard.titleFallback");

  const organizationMeta =
    orgId != null ? (
      <p className="text-xs text-slate-400 leading-relaxed">
        {tf("advocateDashboard.organizationMeta", {
          name: organizationName?.trim() || "—",
        })}
      </p>
    ) : (
      <p className="text-xs text-slate-400 leading-relaxed">
        {t("advocateDashboard.noOrganizationMeta")}{" "}
        <Link
          href={ROUTES.advocateFindOrganizations}
          className="text-teal-400 hover:text-teal-300 font-medium underline-offset-2 hover:underline"
        >
          {t("advocateDashboard.connectOrganizationLink")}
        </Link>
      </p>
    );

  useEffect(() => {
    if (!consentReady || !accessToken) return;
    const run = async () => {
      setCcLoading(true);
      setCcMsg(null);
      try {
        const res = await fetch("/api/advocate/command-center", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setCcMsg(getApiErrorMessage(json, "Could not load your case work queue."));
          setCommandCenter(null);
          return;
        }
        setCommandCenter(json as CommandCenterResponse);
      } catch {
        setCcMsg("Could not load your case work queue.");
        setCommandCenter(null);
      } finally {
        setCcLoading(false);
      }
    };
    run();
  }, [consentReady, accessToken]);

  const topAttentionCases = useMemo(() => {
    const rows = commandCenter?.cases ?? [];
    return rows
      .filter((c) => c.priority === "critical" || c.priority === "high")
      .slice(0, 6);
  }, [commandCenter?.cases]);

  const nextCaseId = topAttentionCases[0]?.id ?? commandCenter?.cases?.[0]?.id ?? null;
  const primaryCaseHref = nextCaseId
    ? `/compensation/intake?case=${encodeURIComponent(nextCaseId)}`
    : `${ROUTES.advocateHome}#advocate-clients`;

  const summary = commandCenter?.summary ?? null;

  if (!consentReady) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto text-sm text-slate-400">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <PageHeader
          contextLine="Advocate"
          eyebrow="My workspace"
          title={dashboardTitle}
          subtitle="Open a client to see their cases. Open a case to view the application (read-only unless you have edit access)."
          meta={organizationMeta}
          rightActions={
            showOrgLink ? (
              <Link
                href={advocateOrgWorkspaceHref}
                className="text-sm font-medium text-slate-300 hover:text-white border border-slate-600 rounded-lg px-3 py-2"
              >
                {t("nav.organization")}
              </Link>
            ) : undefined
          }
        />

        <AdvocateProfileCompletionBanner />

        <section className="rounded-2xl border border-blue-800/40 bg-blue-950/20 p-5 space-y-3">
          <p className="text-[11px] uppercase tracking-wide text-blue-300">Primary action</p>
          <h2 className="text-base font-semibold text-blue-100">Continue case follow-up</h2>
          <p className="text-xs text-blue-100/80">
            Open your next case needing attention, then review victim updates and follow-up tasks.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={primaryCaseHref}
              className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              {nextCaseId ? "Open next case" : "Open client list"}
            </Link>
            <Link
              href={ROUTES.advocateMessages}
              className="inline-flex items-center rounded-full border border-blue-500/40 px-4 py-2 text-xs font-semibold text-blue-100 hover:bg-blue-500/10"
            >
              Review message triage
            </Link>
            <Link
              href={ROUTES.advocateOrgSearch}
              className="inline-flex items-center rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Search organizations
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-200">What needs attention</h2>
            <Link href={ROUTES.advocateMessages} className="text-xs text-slate-400 hover:text-slate-200">
              Messages triage →
            </Link>
          </div>
          {ccLoading ? (
            <p className="text-xs text-slate-400">Loading case queue…</p>
          ) : ccMsg ? (
            <p className="text-xs text-amber-200">{ccMsg}</p>
          ) : !commandCenter || commandCenter.cases.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
              No active case queue yet. Open a connected client to begin casework.
            </div>
          ) : topAttentionCases.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
              No urgent follow-up right now. Continue with active cases and review recent victim
              updates in message triage.
            </div>
          ) : (
            <ul className="space-y-2">
              {topAttentionCases.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-100 truncate">
                      {c.victim_name || `Case ${c.id.slice(0, 8)}…`}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {c.priority_reasons?.[0] ?? "Needs follow-up"}
                    </p>
                  </div>
                  <Link
                    href={`/compensation/intake?case=${encodeURIComponent(c.id)}`}
                    className="inline-flex shrink-0 items-center rounded-full border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                  >
                    Open case
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {summary && (
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
              <span className="rounded-full border border-slate-700 px-2 py-0.5">
                Active cases: {summary.active_case_count}
              </span>
              <span className="rounded-full border border-slate-700 px-2 py-0.5">
                Priority follow-up: {summary.high_priority_count}
              </span>
              <span className="rounded-full border border-slate-700 px-2 py-0.5">
                Cases needing follow-up: {summary.blocking_completeness_count}
              </span>
            </div>
          )}
        </section>

        <section id="advocate-clients" className="scroll-mt-8">
          <AdvocateClientsList email={user?.email ?? null} token={accessToken} hideSignedInLine />
        </section>
      </div>
    </main>
  );
}
