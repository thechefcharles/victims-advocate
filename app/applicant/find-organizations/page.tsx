"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES, applicantCasePaths } from "@/lib/routes/pageRegistry";
import { APP_CARD, APP_PAGE_MAIN } from "@/lib/ui/appSurface";
import { useI18n } from "@/components/i18n/i18nProvider";
import { FindOrganizationsMapSection } from "@/app/applicant/find-organizations/FindOrganizationsMapSection";

function VictimFindOrganizationsContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("case")?.trim() ?? "";

  const backHref = caseId ? applicantCasePaths.organization(caseId) : ROUTES.applicantDashboard;
  const backLabel = caseId
    ? t("applicantDashboard.caseOrgManage.back")
    : t("applicantDashboard.findOrganizationsPage.back");

  const mapCopy = {
    mapIntro: t("applicantDashboard.findOrganizationsPage.mapIntro"),
    shareLocation: t("applicantDashboard.findOrganizationsPage.shareLocation"),
    sharing: t("applicantDashboard.findOrganizationsPage.sharing"),
    tryAgain: t("applicantDashboard.findOrganizationsPage.tryAgain"),
    locationDenied: t("applicantDashboard.findOrganizationsPage.locationDenied"),
    locationUnavailable: t("applicantDashboard.findOrganizationsPage.locationUnavailable"),
    locationTimeout: t("applicantDashboard.findOrganizationsPage.locationTimeout"),
    positionUnavailable: t("applicantDashboard.findOrganizationsPage.positionUnavailable"),
    locationNotSupported: t("applicantDashboard.findOrganizationsPage.locationNotSupported"),
    locationNeedsHttps: t("applicantDashboard.findOrganizationsPage.locationNeedsHttps"),
    yourLocation: t("applicantDashboard.findOrganizationsPage.yourLocation"),
    approximateNote: t("applicantDashboard.findOrganizationsPage.approximateNote"),
    milesAway: t("applicantDashboard.findOrganizationsPage.milesAway"),
    accepting: t("applicantDashboard.findOrganizationsPage.accepting"),
    notAccepting: t("applicantDashboard.findOrganizationsPage.notAccepting"),
    capacity: t("applicantDashboard.findOrganizationsPage.capacity"),
    noOrgs: t("applicantDashboard.findOrganizationsPage.noOrgs"),
    loadError: t("applicantDashboard.findOrganizationsPage.loadError"),
    privacyNote: t("applicantDashboard.findOrganizationsPage.privacyNote"),
    sendReferral: t("applicantDashboard.findOrganizationsPage.sendReferral"),
    sendReferralSending: t("applicantDashboard.findOrganizationsPage.sendReferralSending"),
    sendReferralDone: t("applicantDashboard.findOrganizationsPage.sendReferralDone"),
    sendReferralFailed: t("applicantDashboard.findOrganizationsPage.sendReferralFailed"),
    sendReferralDuplicate: t("applicantDashboard.findOrganizationsPage.sendReferralDuplicate"),
    learnMoreTitle: t("applicantDashboard.findOrganizationsPage.learnMoreTitle"),
    learnMore: t("applicantDashboard.findOrganizationsPage.learnMore"),
    learnMoreClose: t("applicantDashboard.findOrganizationsPage.learnMoreClose"),
    organizationProfile: t("applicantDashboard.findOrganizationsPage.organizationProfile"),
    connectWithOrg: t("applicantDashboard.findOrganizationsPage.connectWithOrg"),
    externalDirectoryNote: t("applicantDashboard.findOrganizationsPage.externalDirectoryNote"),
    profileUnavailableExternal: t("applicantDashboard.findOrganizationsPage.profileUnavailableExternal"),
    connectUnavailableExternal: t("applicantDashboard.findOrganizationsPage.connectUnavailableExternal"),
    directoryProgramType: t("applicantDashboard.findOrganizationsPage.directoryProgramType"),
    directoryAddress: t("applicantDashboard.findOrganizationsPage.directoryAddress"),
    directoryPhone: t("applicantDashboard.findOrganizationsPage.directoryPhone"),
    directoryWebsite: t("applicantDashboard.findOrganizationsPage.directoryWebsite"),
    fieldPendingExternal: t("applicantDashboard.findOrganizationsPage.fieldPendingExternal"),
    fieldPendingFallback: t("applicantDashboard.findOrganizationsPage.fieldPendingFallback"),
    directoryContactHeading: t("applicantDashboard.findOrganizationsPage.directoryContactHeading"),
  };

  return (
    <main className={APP_PAGE_MAIN}>
      <div className="relative max-w-3xl mx-auto space-y-6">
        <PageHeader
          title={t("applicantDashboard.findOrganizationsPage.title")}
          subtitle={
            caseId ? (
              <>
                {t("applicantDashboard.findOrganizationsPage.subtitle")}{" "}
                <span className="block mt-2 text-[var(--color-muted)]">
                  {t("applicantDashboard.caseOrgManage.intro")}
                </span>
              </>
            ) : (
              t("applicantDashboard.findOrganizationsPage.subtitle")
            )
          }
          backLink={{
            href: backHref,
            label: backLabel,
          }}
          className={APP_CARD}
        />
        {caseId ? (
          <div className={`${APP_CARD} text-sm text-[var(--color-muted)]`}>
            <p>
              {t("applicantDashboard.caseOrgManage.changeOrganization")} —{" "}
              <Link
                href={applicantCasePaths.organization(caseId)}
                className="text-[var(--color-teal)] hover:text-[var(--color-teal-deep)] underline"
              >
                {t("applicantDashboard.caseOrgManage.title")}
              </Link>
            </p>
          </div>
        ) : null}

        <section className={APP_CARD}>
          <FindOrganizationsMapSection copy={mapCopy} referCaseId={caseId || undefined} />
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
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="h-8 w-48 rounded-lg bg-[var(--color-light-sand)] animate-pulse" />
            <div className="h-4 w-72 rounded bg-[var(--color-light-sand)] animate-pulse" />
            <div className="h-48 w-full rounded-xl bg-[var(--color-light-sand)] animate-pulse" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-24 rounded-xl bg-[var(--color-light-sand)] animate-pulse" />
              <div className="h-24 rounded-xl bg-[var(--color-light-sand)] animate-pulse" />
              <div className="h-24 rounded-xl bg-[var(--color-light-sand)] animate-pulse" />
              <div className="h-24 rounded-xl bg-[var(--color-light-sand)] animate-pulse" />
            </div>
          </div>
        </main>
      }
    >
      <VictimFindOrganizationsContent />
    </Suspense>
  );
}
