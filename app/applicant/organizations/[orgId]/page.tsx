"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES } from "@/lib/routes/pageRegistry";
import { APP_CARD, APP_PAGE_MAIN } from "@/lib/ui/appSurface";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import type { ResponseAccessibilityPublic } from "@/lib/organizations/responseAccessibilityPublic";
import { useI18n } from "@/components/i18n/i18nProvider";
import { OrganizationTransparencyFramework } from "@/components/victim/OrganizationTransparencyFramework";

type OrgPayload = {
  id: string;
  name: string;
  service_types: string[];
  special_populations: string[];
  accepting_clients: boolean;
  capacity_status: string;
  region_label: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  response_accessibility: ResponseAccessibilityPublic;
};

function formatServiceKey(k: string): string {
  return k
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function VictimOrganizationPublicProfilePage() {
  const { t } = useI18n();
  const params = useParams();
  const orgId = typeof params?.orgId === "string" ? params.orgId : "";

  const [org, setOrg] = useState<OrgPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const frameworkCopy = useMemo(
    () => ({
      learnMoreDialogTitle: t("applicantDashboard.findOrganizationsPage.learnMoreDialogTitle"),
      learnMoreDialogSubtitle: t("applicantDashboard.findOrganizationsPage.learnMoreDialogSubtitle"),
      frameworkFieldPending: t("applicantDashboard.findOrganizationsPage.frameworkFieldPending"),
      fieldPendingExternal: t("applicantDashboard.findOrganizationsPage.fieldPendingExternal"),
      fieldPendingFallback: t("applicantDashboard.findOrganizationsPage.fieldPendingFallback"),
      tier1Title: t("applicantDashboard.findOrganizationsPage.tier1Title"),
      tier1Desc: t("applicantDashboard.findOrganizationsPage.tier1Desc"),
      tier2Title: t("applicantDashboard.findOrganizationsPage.tier2Title"),
      tier2Desc: t("applicantDashboard.findOrganizationsPage.tier2Desc"),
      tier3Title: t("applicantDashboard.findOrganizationsPage.tier3Title"),
      tier3Desc: t("applicantDashboard.findOrganizationsPage.tier3Desc"),
      sourceSelfHint: t("applicantDashboard.findOrganizationsPage.sourceSelfHint"),
      sourcePlatformHint: t("applicantDashboard.findOrganizationsPage.sourcePlatformHint"),
    }),
    [t]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      setOrg(null);
      if (!orgId) {
        setErr(t("applicantDashboard.findOrganizationsPage.orgProfileInvalid"));
        setLoading(false);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        if (!cancelled) {
          setErr(t("applicantDashboard.findOrganizationsPage.loadError"));
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(`/api/applicant/organizations/${encodeURIComponent(orgId)}/public`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) {
            setErr(getApiErrorMessage(json, t("applicantDashboard.findOrganizationsPage.loadError")));
          }
          return;
        }
        const o = json?.data?.organization as Partial<OrgPayload> | undefined;
        if (!cancelled) {
          if (o?.id) {
            setOrg({
              id: o.id,
              name: o.name ?? "",
              service_types: Array.isArray(o.service_types) ? o.service_types : [],
              special_populations: Array.isArray(o.special_populations) ? o.special_populations : [],
              accepting_clients: Boolean(o.accepting_clients),
              capacity_status: o.capacity_status ?? "unknown",
              region_label: o.region_label ?? "",
              address: o.address ?? null,
              phone: o.phone ?? null,
              website: o.website ?? null,
              response_accessibility: o.response_accessibility as ResponseAccessibilityPublic,
            });
          } else setErr(t("applicantDashboard.findOrganizationsPage.loadError"));
        }
      } catch {
        if (!cancelled) setErr(t("applicantDashboard.findOrganizationsPage.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, t]);

  return (
    <main className={APP_PAGE_MAIN}>
      <div className="relative max-w-3xl mx-auto space-y-6">
        <PageHeader
          title={
            org?.name ??
            (loading ? t("applicantDashboard.findOrganizationsPage.orgProfileLoading") : "Organization")
          }
          subtitle={t("applicantDashboard.findOrganizationsPage.orgProfileSubtitle")}
          backLink={{
            href: ROUTES.applicantFindOrganizations,
            label: t("applicantDashboard.findOrganizationsPage.orgProfileBack"),
          }}
          className={APP_CARD}
        />

        {loading ? (
          <div className={`${APP_CARD} text-sm text-[var(--color-muted)] animate-pulse`}>
            {t("applicantDashboard.findOrganizationsPage.orgProfileLoading")}
          </div>
        ) : null}

        {err && !loading ? (
          <div className={`${APP_CARD} rounded-xl border border-red-900/40 bg-red-950/25 px-4 py-3 text-sm text-red-200`}>
            {err}
          </div>
        ) : null}

        {org && !loading ? (
          <div className={`${APP_CARD} space-y-6`}>
            <div className="text-sm text-[var(--color-muted)]">
              <span className="text-[var(--color-muted)]">{org.region_label}</span>
              <span className="text-[var(--color-slate)]"> · </span>
              {org.accepting_clients ? (
                <span className="text-emerald-400/90">
                  {t("applicantDashboard.findOrganizationsPage.accepting")}
                </span>
              ) : (
                <span className="text-[var(--color-muted)]">
                  {t("applicantDashboard.findOrganizationsPage.notAccepting")}
                </span>
              )}
              <span className="text-[var(--color-slate)]"> · </span>
              <span className="text-[var(--color-muted)]">
                {t("applicantDashboard.findOrganizationsPage.capacity")}: {org.capacity_status}
              </span>
            </div>

            {(org.address || org.phone || org.website) ? (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                  {t("applicantDashboard.findOrganizationsPage.orgProfileContact")}
                </h2>
                <dl className="grid gap-2 text-sm text-[var(--color-slate)]">
                  {org.address ? (
                    <div>
                      <dt className="text-xs text-[var(--color-muted)]">
                        {t("applicantDashboard.findOrganizationsPage.directoryAddress")}
                      </dt>
                      <dd>{org.address}</dd>
                    </div>
                  ) : null}
                  {org.phone ? (
                    <div>
                      <dt className="text-xs text-[var(--color-muted)]">
                        {t("applicantDashboard.findOrganizationsPage.directoryPhone")}
                      </dt>
                      <dd>
                        <a href={`tel:${org.phone.replace(/\D/g, "")}`} className="text-[var(--color-teal)] hover:text-[var(--color-teal-deep)] underline">
                          {org.phone}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  {org.website ? (
                    <div>
                      <dt className="text-xs text-[var(--color-muted)]">
                        {t("applicantDashboard.findOrganizationsPage.directoryWebsite")}
                      </dt>
                      <dd>
                        <a
                          href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--color-teal)] hover:text-[var(--color-teal-deep)] underline"
                        >
                          {org.website}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}

            {org.special_populations?.length ? (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)] mb-2">
                  {t("applicantDashboard.findOrganizationsPage.orgProfilePopulations")}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {org.special_populations.map((s) => (
                    <li
                      key={s}
                      className="rounded-full border border-[var(--color-border)] bg-white/92 px-3 py-1 text-xs text-[var(--color-charcoal)]"
                    >
                      {formatServiceKey(s)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {org.service_types.length > 0 ? (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)] mb-2">
                  {t("applicantDashboard.findOrganizationsPage.orgProfileServices")}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {org.service_types.map((s) => (
                    <li
                      key={s}
                      className="rounded-full border border-[var(--color-border)] bg-white/92 px-3 py-1 text-xs text-[var(--color-charcoal)]"
                    >
                      {formatServiceKey(s)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/60 px-4 py-4 text-center">
                <p className="text-sm font-medium text-[var(--color-navy)]">This organization hasn&apos;t listed their programs yet.</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">Contact them directly to learn more about their services.</p>
              </div>
            )}

            <OrganizationTransparencyFramework
              external={false}
              responseAccessibility={org.response_accessibility}
              copy={frameworkCopy}
            />

            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              {t("applicantDashboard.findOrganizationsPage.orgProfileFooter")}
            </p>

            <Link
              href={ROUTES.applicantFindOrganizations}
              className="inline-flex text-sm text-[var(--color-teal)] hover:text-[var(--color-teal-deep)] underline"
            >
              {t("applicantDashboard.findOrganizationsPage.orgProfileBack")}
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
