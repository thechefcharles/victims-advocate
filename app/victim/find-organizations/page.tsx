"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES, victimCasePaths } from "@/lib/routes/pageRegistry";
import { APP_CARD, APP_PAGE_MAIN } from "@/lib/ui/appSurface";
import { useI18n } from "@/components/i18n/i18nProvider";
import { FindOrganizationsMapSection } from "@/app/victim/find-organizations/FindOrganizationsMapSection";

function VictimFindOrganizationsContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("case")?.trim() ?? "";

  const backHref = caseId ? victimCasePaths.organization(caseId) : ROUTES.victimDashboard;
  const backLabel = caseId
    ? t("victimDashboard.caseOrgManage.back")
    : t("victimDashboard.findOrganizationsPage.back");

  const mapCopy = {
    mapIntro: t("victimDashboard.findOrganizationsPage.mapIntro"),
    shareLocation: t("victimDashboard.findOrganizationsPage.shareLocation"),
    sharing: t("victimDashboard.findOrganizationsPage.sharing"),
    tryAgain: t("victimDashboard.findOrganizationsPage.tryAgain"),
    locationDenied: t("victimDashboard.findOrganizationsPage.locationDenied"),
    locationUnavailable: t("victimDashboard.findOrganizationsPage.locationUnavailable"),
    locationTimeout: t("victimDashboard.findOrganizationsPage.locationTimeout"),
    positionUnavailable: t("victimDashboard.findOrganizationsPage.positionUnavailable"),
    locationNotSupported: t("victimDashboard.findOrganizationsPage.locationNotSupported"),
    locationNeedsHttps: t("victimDashboard.findOrganizationsPage.locationNeedsHttps"),
    yourLocation: t("victimDashboard.findOrganizationsPage.yourLocation"),
    approximateNote: t("victimDashboard.findOrganizationsPage.approximateNote"),
    milesAway: t("victimDashboard.findOrganizationsPage.milesAway"),
    accepting: t("victimDashboard.findOrganizationsPage.accepting"),
    notAccepting: t("victimDashboard.findOrganizationsPage.notAccepting"),
    capacity: t("victimDashboard.findOrganizationsPage.capacity"),
    noOrgs: t("victimDashboard.findOrganizationsPage.noOrgs"),
    loadError: t("victimDashboard.findOrganizationsPage.loadError"),
    privacyNote: t("victimDashboard.findOrganizationsPage.privacyNote"),
  };

  return (
    <main className={APP_PAGE_MAIN}>
      <div className="relative max-w-3xl mx-auto space-y-6">
        <PageHeader
          title={t("victimDashboard.findOrganizationsPage.title")}
          subtitle={
            caseId ? (
              <>
                {t("victimDashboard.findOrganizationsPage.subtitle")}{" "}
                <span className="block mt-2 text-slate-400">
                  {t("victimDashboard.caseOrgManage.intro")}
                </span>
              </>
            ) : (
              t("victimDashboard.findOrganizationsPage.subtitle")
            )
          }
          backLink={{
            href: backHref,
            label: backLabel,
          }}
          className={APP_CARD}
        />
        {caseId ? (
          <div className={`${APP_CARD} text-sm text-slate-400`}>
            <p>
              {t("victimDashboard.caseOrgManage.changeOrganization")} —{" "}
              <Link
                href={victimCasePaths.organization(caseId)}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                {t("victimDashboard.caseOrgManage.title")}
              </Link>
            </p>
          </div>
        ) : null}

        <section className={APP_CARD}>
          <FindOrganizationsMapSection copy={mapCopy} />
        </section>
      </div>
    </main>
  );
}

export default function VictimFindOrganizationsPage() {
  return (
    <Suspense
      fallback={
        <main className={APP_PAGE_MAIN}>
          <div className="max-w-3xl mx-auto text-slate-400 text-sm">Loading…</div>
        </main>
      }
    >
      <VictimFindOrganizationsContent />
    </Suspense>
  );
}
