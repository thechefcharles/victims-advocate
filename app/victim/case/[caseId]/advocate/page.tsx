"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES, compensationIntakeMessagesUrl, victimCasePaths } from "@/lib/routes/pageRegistry";
import { APP_CARD, APP_PAGE_MAIN } from "@/lib/ui/appSurface";
import { useI18n } from "@/components/i18n/i18nProvider";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type SupportTeamPayload = {
  organization: { id: string; name: string } | null;
  advocates: { id: string; label: string }[];
};

export default function VictimCaseAdvocateManagePage() {
  const params = useParams();
  const caseId = typeof params.caseId === "string" ? params.caseId : "";
  const { accessToken } = useAuth();
  const { t } = useI18n();

  const [team, setTeam] = useState<SupportTeamPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !caseId) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/compensation/cases/${caseId}/support-team`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Failed to load"));
        setTeam(null);
        return;
      }
      const d = (json?.data ?? json) as SupportTeamPayload;
      setTeam({
        organization: d?.organization ?? null,
        advocates: Array.isArray(d?.advocates) ? d.advocates : [],
      });
    } catch {
      setErr("Failed to load");
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const removeAdvocate = async (advocateUserId: string) => {
    if (!accessToken || !caseId) return;
    setBusyId(advocateUserId);
    setToast(null);
    try {
      const res = await fetch(`/api/compensation/cases/${caseId}/advocates/${advocateUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(getApiErrorMessage(json, t("victimDashboard.caseAdvocateManage.removeFailed")));
        return;
      }
      setToast(t("victimDashboard.caseAdvocateManage.removed"));
      await load();
    } catch {
      setErr(t("victimDashboard.caseAdvocateManage.removeFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const connectHref = `${ROUTES.compensationConnectAdvocate}?case=${encodeURIComponent(caseId)}`;
  const messagesHref = compensationIntakeMessagesUrl(caseId);

  return (
    <main className={APP_PAGE_MAIN}>
      <div className="relative max-w-2xl mx-auto space-y-6">
        <PageHeader
          title={t("victimDashboard.caseAdvocateManage.title")}
          subtitle={t("victimDashboard.caseAdvocateManage.intro")}
          backLink={{
            href: ROUTES.victimDashboard,
            label: t("victimDashboard.caseAdvocateManage.back"),
          }}
          className={APP_CARD}
        />

        {err ? (
          <p className="text-sm text-red-300 border border-red-500/30 rounded-lg px-3 py-2">{err}</p>
        ) : null}
        {toast ? (
          <p className="text-sm text-emerald-200 border border-emerald-500/30 rounded-lg px-3 py-2">{toast}</p>
        ) : null}

        <div className={`${APP_CARD} space-y-4`}>
          <Link
            href={connectHref}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#14b8a6] to-[#0d9488] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/30 hover:brightness-110"
          >
            {t("victimDashboard.caseAdvocateManage.connectDifferent")}
          </Link>

          {loading ? (
            <p className="text-sm text-[var(--color-muted)]">{t("victimDashboard.supportTeamLoading")}</p>
          ) : team?.advocates && team.advocates.length > 0 ? (
            <ul className="space-y-3">
              {team.advocates.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/70 px-3 py-3"
                >
                  <span className="text-sm font-medium text-[var(--color-navy)]">{a.label}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={messagesHref}
                      className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-charcoal)] hover:bg-[var(--color-warm-cream)]/90"
                    >
                      {t("victimDashboard.caseAdvocateManage.sendMessage")}
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => {
                        if (
                          typeof window !== "undefined" &&
                          window.confirm(
                            `${t("victimDashboard.caseAdvocateManage.removeConfirmTitle")}\n\n${t("victimDashboard.caseAdvocateManage.removeConfirmBody")}`
                          )
                        ) {
                          void removeAdvocate(a.id);
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-full border border-red-500/40 px-3 py-1.5 text-[11px] font-semibold text-red-200/95 hover:bg-red-950/40 disabled:opacity-50"
                    >
                      {t("victimDashboard.caseAdvocateManage.remove")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">{t("victimDashboard.supportTeamNoAdvocates")}</p>
          )}
        </div>

        <p className="text-[11px] text-[var(--color-muted)]">
          <Link href={victimCasePaths.organization(caseId)} className="text-[var(--color-muted)] hover:text-[var(--color-charcoal)] underline">
            {t("victimDashboard.caseOrgManage.title")}
          </Link>
        </p>
      </div>
    </main>
  );
}
