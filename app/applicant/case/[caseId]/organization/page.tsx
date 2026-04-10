"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  ROUTES,
  applicantCasePaths,
  compensationIntakeMessagesUrl,
} from "@/lib/routes/pageRegistry";
import { APP_CARD, APP_PAGE_MAIN } from "@/lib/ui/appSurface";
import { useI18n } from "@/components/i18n/i18nProvider";
import { getApiErrorMessage } from "@/lib/utils/apiError";

const LEGACY_ORG_NAME = "Legacy (pre-tenant)";

type SupportTeamPayload = {
  organization: { id: string; name: string } | null;
  advocates: { id: string; label: string }[];
};

type ReferralSummary = {
  id: string;
  status: string;
  created_at: string;
  to_organization_id: string;
  to_organization_name: string;
};

export default function VictimCaseOrganizationManagePage() {
  const params = useParams();
  const caseId = typeof params.caseId === "string" ? params.caseId : "";
  const { accessToken } = useAuth();
  const { t } = useI18n();

  const [team, setTeam] = useState<SupportTeamPayload | null>(null);
  const [referrals, setReferrals] = useState<ReferralSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [referralErr, setReferralErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !caseId) return;
    setLoading(true);
    setErr(null);
    setReferralErr(null);
    try {
      const [teamRes, refRes] = await Promise.all([
        fetch(`/api/compensation/cases/${caseId}/support-team`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`/api/cases/${caseId}/org-referrals`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      const teamJson = await teamRes.json().catch(() => ({}));
      if (!teamRes.ok) {
        setErr(
          getApiErrorMessage(
            teamJson,
            "We couldn't load your organization team for this case. Refresh the page and try again.",
          ),
        );
        setTeam(null);
      } else {
        const d = (teamJson?.data ?? teamJson) as SupportTeamPayload;
        setTeam({
          organization: d?.organization ?? null,
          advocates: Array.isArray(d?.advocates) ? d.advocates : [],
        });
      }

      const refJson = await refRes.json().catch(() => ({}));
      if (refRes.ok) {
        const list = (refJson?.data?.referrals ?? refJson?.referrals) as ReferralSummary[] | undefined;
        setReferrals(Array.isArray(list) ? list : []);
      } else if (refRes.status === 403) {
        setReferrals([]);
      } else {
        setReferrals([]);
        setReferralErr(getApiErrorMessage(refJson, t("applicantDashboard.caseOrgManage.referralsLoadError")));
      }
    } catch {
      setErr("Failed to load");
      setTeam(null);
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, caseId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const removeOrganization = async () => {
    if (!caseId) return;
    if (!accessToken) {
      setErr(t("applicantDashboard.sessionExpired"));
      return;
    }
    setBusy(true);
    setToast(null);
    setErr(null);
    try {
      const res = await fetch(`/api/compensation/cases/${caseId}/organization`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ organization_id: null }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: { message?: string };
        message?: string;
      };
      if (!res.ok || json.ok === false) {
        setErr(getApiErrorMessage(json, t("applicantDashboard.caseOrgManage.updateFailed")));
        return;
      }
      setErr(null);
      setToast(t("applicantDashboard.caseOrgManage.organizationRemoved"));
      await load();
    } catch {
      setErr(t("applicantDashboard.caseOrgManage.updateFailed"));
    } finally {
      setBusy(false);
    }
  };

  const findOrgHref = `${ROUTES.applicantFindOrganizations}?case=${encodeURIComponent(caseId)}`;
  const messagesHref = compensationIntakeMessagesUrl(caseId);

  const org = team?.organization;
  const isLegacy = org?.name === LEGACY_ORG_NAME;

  const referralStatusLabel = (status: string) => {
    if (status === "accepted") return t("applicantDashboard.caseOrgManage.referralStatusAccepted");
    if (status === "declined") return t("applicantDashboard.caseOrgManage.referralStatusDeclined");
    return t("applicantDashboard.caseOrgManage.referralStatusPending");
  };

  return (
    <main className={APP_PAGE_MAIN}>
      <div className="relative max-w-2xl mx-auto space-y-6">
        <PageHeader
          title={t("applicantDashboard.caseOrgManage.title")}
          subtitle={t("applicantDashboard.caseOrgManage.intro")}
          backLink={{
            href: ROUTES.applicantDashboard,
            label: t("applicantDashboard.caseOrgManage.back"),
          }}
          className={APP_CARD}
        />

        {err ? (
          <p className="text-sm text-red-300 border border-red-500/30 rounded-lg px-3 py-2">{err}</p>
        ) : null}
        {!loading && referralErr && referrals.length === 0 ? (
          <p className="text-sm text-amber-200/90 border border-amber-700/40 rounded-lg px-3 py-2">
            {referralErr}
          </p>
        ) : null}
        {toast ? (
          <p className="text-sm text-emerald-200 border border-emerald-500/30 rounded-lg px-3 py-2">{toast}</p>
        ) : null}

        <div className={`${APP_CARD} space-y-4`}>
          {loading ? (
            <p className="text-sm text-[var(--color-muted)]">{t("applicantDashboard.supportTeamLoading")}</p>
          ) : (
            <>
              <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/70 px-3 py-3">
                <p className="text-[10px] uppercase tracking-wide text-[var(--color-slate)]">
                  {t("applicantDashboard.supportTeamOrg")}
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-navy)]">
                  {org
                    ? isLegacy
                      ? t("applicantDashboard.caseOrgManage.legacyLabel")
                      : org.name
                    : t("applicantDashboard.caseOrgManage.noOrgBody")}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link
                  href={messagesHref}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-charcoal)] hover:bg-[var(--color-warm-cream)]/90"
                >
                  {t("applicantDashboard.caseOrgManage.contactOrganization")}
                </Link>
                <Link
                  href={findOrgHref}
                  className="inline-flex items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-950/30 px-4 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-950/50"
                >
                  {t("applicantDashboard.caseOrgManage.changeOrganization")}
                </Link>
                {org && !isLegacy ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        typeof window !== "undefined" &&
                        window.confirm(
                          `${t("applicantDashboard.caseOrgManage.removeConfirmTitle")}\n\n${t("applicantDashboard.caseOrgManage.removeConfirmBody")}`
                        )
                      ) {
                        void removeOrganization();
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-200/95 hover:bg-red-950/40 disabled:opacity-50"
                  >
                    {t("applicantDashboard.caseOrgManage.removeOrganization")}
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>

        {!loading ? (
          <div className={`${APP_CARD} space-y-3`}>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--color-slate)]">
                {t("applicantDashboard.caseOrgManage.referralUpdatesTitle")}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">{t("applicantDashboard.caseOrgManage.referralUpdatesIntro")}</p>
            </div>
            {referrals.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">{t("applicantDashboard.caseOrgManage.referralUpdatesEmpty")}</p>
            ) : (
              <ul className="space-y-2">
                {referrals.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/70 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-[var(--color-navy)]">{r.to_organization_name}</p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">{referralStatusLabel(r.status)}</p>
                    <p className="text-[10px] text-[var(--color-slate)] mt-1">
                      {new Date(r.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <p className="text-[11px] text-[var(--color-muted)]">
          <Link href={applicantCasePaths.advocate(caseId)} className="text-[var(--color-muted)] hover:text-[var(--color-charcoal)] underline">
            {t("applicantDashboard.caseAdvocateManage.title")}
          </Link>
        </p>
      </div>
    </main>
  );
}
