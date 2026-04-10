"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES } from "@/lib/routes/pageRegistry";
import { APP_CARD, APP_PAGE_MAIN } from "@/lib/ui/appSurface";
import { useI18n } from "@/components/i18n/i18nProvider";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import {
  ORGANIZATION_CONNECT_HELP_NEED_KEYS,
  type OrganizationConnectHelpNeedKey,
} from "@/lib/victim/organizationConnectHelpNeeds";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function needLabel(
  t: (k: string) => string,
  key: OrganizationConnectHelpNeedKey
): string {
  switch (key) {
    case "general_support":
      return t("applicantDashboard.findOrganizationsPage.needGeneralSupport");
    case "police_report":
      return t("applicantDashboard.findOrganizationsPage.needPoliceReport");
    case "medical_bills":
      return t("applicantDashboard.findOrganizationsPage.needMedicalBills");
    case "employment":
      return t("applicantDashboard.findOrganizationsPage.needEmployment");
    case "funeral":
      return t("applicantDashboard.findOrganizationsPage.needFuneral");
    default:
      return key;
  }
}

function ConnectOrganizationHelpInner() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const organizationId = (searchParams.get("organization") ?? "").trim();
  const caseId = (searchParams.get("case") ?? "").trim();

  const backHref = useMemo(
    () =>
      caseId
        ? `${ROUTES.applicantFindOrganizations}?case=${encodeURIComponent(caseId)}`
        : ROUTES.applicantFindOrganizations,
    [caseId]
  );

  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgLoadErr, setOrgLoadErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<OrganizationConnectHelpNeedKey>>(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const validOrg = UUID_RE.test(organizationId);

  useEffect(() => {
    if (!validOrg) return;
    let cancelled = false;
    (async () => {
      setOrgLoadErr(null);
      setOrgName(null);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        if (!cancelled) setOrgLoadErr(t("applicantDashboard.findOrganizationsPage.connectHelpNeedsLoadOrgError"));
        return;
      }
      try {
        const res = await fetch(
          `/api/victim/organizations/${encodeURIComponent(organizationId)}/public`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) {
            setOrgLoadErr(
              getApiErrorMessage(json, t("applicantDashboard.findOrganizationsPage.connectHelpNeedsLoadOrgError"))
            );
          }
          return;
        }
        const name = (json?.data?.organization?.name as string | undefined)?.trim();
        if (!cancelled) setOrgName(name?.length ? name : "Organization");
      } catch {
        if (!cancelled) setOrgLoadErr(t("applicantDashboard.findOrganizationsPage.connectHelpNeedsLoadOrgError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId, validOrg, t]);

  useEffect(() => {
    if (!done) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [done]);

  const toggle = useCallback((key: OrganizationConnectHelpNeedKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setFormErr(null);
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormErr(null);
      if (!validOrg) return;
      const help_needs = ORGANIZATION_CONNECT_HELP_NEED_KEYS.filter((k) => selected.has(k));
      if (help_needs.length === 0) {
        setFormErr(t("applicantDashboard.findOrganizationsPage.connectHelpNeedsPickOne"));
        return;
      }
      setSubmitting(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setFormErr(t("applicantDashboard.findOrganizationsPage.connectFailed"));
          return;
        }
        const res = await fetch("/api/victim/organization-connect-request", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ organization_id: organizationId, help_needs }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 409) {
            setFormErr(t("applicantDashboard.findOrganizationsPage.connectDuplicate"));
            return;
          }
          setFormErr(getApiErrorMessage(json, t("applicantDashboard.findOrganizationsPage.connectFailed")));
          return;
        }
        setDone(true);
      } catch {
        setFormErr(t("applicantDashboard.findOrganizationsPage.connectFailed"));
      } finally {
        setSubmitting(false);
      }
    },
    [organizationId, selected, t, validOrg]
  );

  if (!validOrg) {
    return (
      <main className={APP_PAGE_MAIN}>
        <div className="relative max-w-lg mx-auto space-y-4">
          <PageHeader
            title={t("applicantDashboard.findOrganizationsPage.connectHelpNeedsTitle")}
            subtitle={t("applicantDashboard.findOrganizationsPage.connectHelpNeedsInvalidLink")}
            backLink={{ href: backHref, label: t("applicantDashboard.findOrganizationsPage.connectHelpNeedsBack") }}
            className={APP_CARD}
          />
          <Link
            href={backHref}
            className="inline-flex text-sm text-[var(--color-teal)] hover:text-[var(--color-teal-deep)] underline"
          >
            {t("applicantDashboard.findOrganizationsPage.connectHelpNeedsContinueBrowse")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={APP_PAGE_MAIN}>
      <div
        className={`relative max-w-lg mx-auto space-y-6 ${done ? "pointer-events-none opacity-40" : ""}`}
        aria-hidden={done}
      >
        <PageHeader
          title={t("applicantDashboard.findOrganizationsPage.connectHelpNeedsTitle")}
          subtitle={t("applicantDashboard.findOrganizationsPage.connectHelpNeedsSubtitle")}
          backLink={{ href: backHref, label: t("applicantDashboard.findOrganizationsPage.connectHelpNeedsBack") }}
          className={APP_CARD}
        />

        {orgLoadErr ? (
          <div className={`${APP_CARD} border border-amber-500/35 bg-amber-950/20 text-sm text-amber-100 px-4 py-3`}>
            {orgLoadErr}
          </div>
        ) : null}

        {orgName ? (
          <p className="text-sm text-[var(--color-muted)] px-1">
            <span className="text-[var(--color-muted)]">
              {t("applicantDashboard.findOrganizationsPage.connectHelpNeedsOrgLabel")}:{" "}
            </span>
            <span className="font-medium text-[var(--color-charcoal)]">{orgName}</span>
          </p>
        ) : !orgLoadErr && validOrg && !orgName ? (
          <p className="text-xs text-[var(--color-slate)] px-1 animate-pulse">
            {t("applicantDashboard.findOrganizationsPage.orgProfileLoading")}
          </p>
        ) : null}

        <form onSubmit={(e) => void onSubmit(e)} className={`${APP_CARD} space-y-4`}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {t("applicantDashboard.findOrganizationsPage.connectHelpNeedsSelectHint")}
          </p>
          <ul className="space-y-3">
            {ORGANIZATION_CONNECT_HELP_NEED_KEYS.map((key) => (
              <li key={key}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/70 px-3 py-3 hover:border-[var(--color-border)]">
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => toggle(key)}
                    className="mt-1 h-4 w-4 rounded border-[var(--color-border)] bg-white text-teal-600 focus:ring-teal-500/40"
                  />
                  <span className="text-sm text-[var(--color-charcoal)]">{needLabel(t, key)}</span>
                </label>
              </li>
            ))}
          </ul>

          {formErr ? (
            <p className="text-sm text-amber-200/95">{formErr}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || Boolean(orgLoadErr) || !orgName}
            className="w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:opacity-50"
          >
            {submitting
              ? t("applicantDashboard.findOrganizationsPage.connectHelpNeedsSubmitting")
              : t("applicantDashboard.findOrganizationsPage.connectHelpNeedsSubmit")}
          </button>
        </form>
      </div>

      {done ? (
        <div
          className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="connect-success-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-warm-white)] px-5 py-6 shadow-2xl shadow-black/50 space-y-4">
            <h2
              id="connect-success-modal-title"
              className="text-lg font-semibold text-[var(--color-navy)] tracking-tight"
            >
              {t("applicantDashboard.findOrganizationsPage.connectSuccessModalTitle")}
            </h2>
            <p className="text-sm text-[var(--color-slate)] leading-relaxed">
              {t("applicantDashboard.findOrganizationsPage.connectSuccessModalBody")}
            </p>
            <p className="text-sm text-[var(--color-slate)] leading-relaxed">
              {t("applicantDashboard.findOrganizationsPage.connectSuccessModalCrisisLead")}{" "}
              <a href="tel:911" className="font-medium text-teal-400 underline hover:text-teal-300">
                911
              </a>{" "}
              {t("applicantDashboard.findOrganizationsPage.connectSuccessModalCrisisOr")}{" "}
              <a href="tel:988" className="font-medium text-rose-300 underline hover:text-rose-200">
                988
              </a>{" "}
              {t("applicantDashboard.findOrganizationsPage.connectSuccessModalCrisisTail")}
            </p>
            <Link
              href={ROUTES.applicantDashboard}
              className="mt-2 flex min-h-[2.75rem] w-full items-center justify-center rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50"
            >
              {t("applicantDashboard.findOrganizationsPage.connectSuccessModalReturnDashboard")}
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function VictimConnectOrganizationHelpPage() {
  return (
    <Suspense
      fallback={
        <main className={APP_PAGE_MAIN}>
          <div className="max-w-lg mx-auto text-[var(--color-muted)] text-sm">Loading…</div>
        </main>
      }
    >
      <ConnectOrganizationHelpInner />
    </Suspense>
  );
}
