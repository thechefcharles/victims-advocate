"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConsentRedirect } from "@/components/auth/useConsentRedirect";
import { useI18n } from "@/components/i18n/i18nProvider";
import { ROUTES } from "@/lib/routes/pageRegistry";
import { PageHeader } from "@/components/layout/PageHeader";
import { APP_CARD, APP_PAGE_MAIN } from "@/lib/ui/appSurface";
import { AdvocateConnectOrganizationsSection } from "@/app/advocate/find-organizations/AdvocateConnectOrganizationsSection";
import { normalizeUsStateCode } from "@/lib/geo/usStates";

export default function AdvocateFindOrganizationsPage() {
  const { accessToken, advocatePersonalInfo } = useAuth();
  const consentReady = useConsentRedirect(accessToken, ROUTES.advocateFindOrganizations);
  const { t } = useI18n();

  const initialState = normalizeUsStateCode(advocatePersonalInfo?.work_state ?? null);

  const copy = {
    mapIntro: t("advocateFindOrganizations.mapIntro"),
    stateFilterLabel: t("advocateFindOrganizations.stateFilterLabel"),
    shareLocation: t("advocateFindOrganizations.shareLocation"),
    sharing: t("advocateFindOrganizations.sharing"),
    tryAgain: t("advocateFindOrganizations.tryAgain"),
    locationDenied: t("advocateFindOrganizations.locationDenied"),
    locationUnavailable: t("advocateFindOrganizations.locationUnavailable"),
    locationTimeout: t("advocateFindOrganizations.locationTimeout"),
    positionUnavailable: t("advocateFindOrganizations.positionUnavailable"),
    locationNotSupported: t("advocateFindOrganizations.locationNotSupported"),
    locationNeedsHttps: t("advocateFindOrganizations.locationNeedsHttps"),
    yourLocation: t("advocateFindOrganizations.yourLocation"),
    approximateNote: t("advocateFindOrganizations.approximateNote"),
    milesAway: t("advocateFindOrganizations.milesAway"),
    accepting: t("advocateFindOrganizations.accepting"),
    notAccepting: t("advocateFindOrganizations.notAccepting"),
    capacity: t("advocateFindOrganizations.capacity"),
    noOrgs: t("advocateFindOrganizations.noOrgs"),
    noOrgsInState: t("advocateFindOrganizations.noOrgsInState"),
    loadError: t("advocateFindOrganizations.loadError"),
    privacyNote: t("advocateFindOrganizations.privacyNote"),
    requestJoin: t("advocateFindOrganizations.requestJoin"),
    requestSent: t("advocateFindOrganizations.requestSent"),
    requestBusy: t("advocateFindOrganizations.requestBusy"),
    requestError: t("advocateFindOrganizations.requestError"),
    orgPickerLabel: t("advocateFindOrganizations.orgPickerLabel"),
    orgSearchPlaceholder: t("advocateFindOrganizations.orgSearchPlaceholder"),
    orgSearchNoMatches: t("advocateFindOrganizations.orgSearchNoMatches"),
    orgSelectedTitle: t("advocateFindOrganizations.orgSelectedTitle"),
  };

  if (!consentReady) {
    return (
      <main className={APP_PAGE_MAIN}>
        <div className="max-w-3xl mx-auto text-[var(--color-muted)] text-sm">Loading…</div>
      </main>
    );
  }

  return (
    <main className={APP_PAGE_MAIN}>
      <div className="relative max-w-3xl mx-auto space-y-6">
        <PageHeader
          title={t("advocateFindOrganizations.title")}
          subtitle={t("advocateFindOrganizations.subtitle")}
          backLink={{
            href: ROUTES.advocateHome,
            label: t("advocateFindOrganizations.back"),
          }}
          className={APP_CARD}
        />

        <section className={APP_CARD}>
          <AdvocateConnectOrganizationsSection
            copy={copy}
            initialStateCode={initialState}
            accessToken={accessToken}
          />
        </section>

        <p className="text-xs text-[var(--color-muted)]">
          <Link href={ROUTES.account} className="text-teal-400 hover:text-teal-300">
            {t("nav.myAccount")}
          </Link>
          {" · "}
          <Link href={ROUTES.help} className="text-[var(--color-muted)] hover:text-[var(--color-charcoal)]">
            {t("nav.help")}
          </Link>
        </p>
      </div>
    </main>
  );
}
