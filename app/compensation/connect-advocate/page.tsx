"use client";

import { useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { ROUTES } from "@/lib/routes/pageRegistry";
import { FindOrganizationsMapSection } from "@/app/victim/find-organizations/FindOrganizationsMapSection";
import { US_STATE_OPTIONS } from "@/lib/geo/usStates";

const STATE_SELECT_OPTIONS = US_STATE_OPTIONS.filter((o) => o.value !== "");

function ConnectAdvocateForm() {
  const router = useRouter();
  const { t } = useI18n();
  const { accessToken } = useAuth();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("case")?.trim() ?? "";

  const tc = (key: string) => t(`compensationConnectAdvocate.${key}`);

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [usState, setUsState] = useState("IL");
  const [zip, setZip] = useState("");
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeErr, setGeocodeErr] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodeLabel, setGeocodeLabel] = useState<string | null>(null);

  const [advocateEmail, setAdvocateEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  const canUseApis = Boolean(accessToken);
  const canSubmitEmail = Boolean(caseId) && canUseApis;

  const mapCopy = useMemo(
    () => ({
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
      organizationProfile: "View details",
      connectWithOrg: "Connect this advocate",
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
    }),
    [t]
  );

  const handleGeocode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeocodeErr(null);
    if (!canUseApis) {
      setGeocodeErr(t("applicantDashboard.findOrganizationsPage.loadError"));
      return;
    }
    setGeocodeLoading(true);
    try {
      const res = await fetch("/api/applicant/geocode-address", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          street: street.trim(),
          city: city.trim(),
          state: usState.trim(),
          zip: zip.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGeocodeErr(getApiErrorMessage(json, tc("geocodeFailed")));
        return;
      }
      const data = json?.data as { lat?: number; lng?: number; display_name?: string } | undefined;
      if (
        data?.lat == null ||
        data?.lng == null ||
        !Number.isFinite(data.lat) ||
        !Number.isFinite(data.lng)
      ) {
        setGeocodeErr(tc("geocodeFailed"));
        return;
      }
      setUserPosition({ lat: data.lat, lng: data.lng });
      setGeocodeLabel(typeof data.display_name === "string" ? data.display_name : null);
    } catch {
      setGeocodeErr(tc("geocodeFailed"));
    } finally {
      setGeocodeLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailErr(null);
    const email = advocateEmail.trim().toLowerCase();
    if (!email || !caseId) return;

    setEmailLoading(true);
    try {
      const res = await fetch("/api/advocate-connections/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ advocate_email: email, case_id: caseId }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setEmailErr(
          getApiErrorMessage(
            json,
            "We couldn't send that connection request. Check the email and try again.",
          ),
        );
        return;
      }

      setAdvocateEmail("");
      router.replace(ROUTES.applicantDashboard);
      router.refresh();
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <Link
            href={ROUTES.compensationHub}
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-charcoal)] inline-flex items-center gap-1 mb-4"
          >
            ← Back to compensation
          </Link>
          <h1 className="text-2xl font-bold">{tc("title")}</h1>
          <p className="text-sm text-[var(--color-slate)] mt-2 leading-relaxed">{tc("subtitle")}</p>
          {!caseId ? (
            <div className="mt-4 rounded-lg border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-sm text-amber-100/95">
              <p className="leading-relaxed">{tc("caseRequiredHint")}</p>
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-100/90">
              {tc("caseLinkedNote")}
            </p>
          )}
        </header>

        <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/90 p-6 space-y-4">
          <h2 className="text-base font-semibold text-[var(--color-navy)]">{tc("addressStepTitle")}</h2>
          <p className="text-xs text-[var(--color-muted)] leading-relaxed">{tc("addressStepBody")}</p>
          <p className="text-xs text-[var(--color-muted)] leading-relaxed border-l-2 border-[var(--color-border)] pl-3">
            {tc("directoryNote")}
          </p>

          {userPosition ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setUserPosition(null);
                  setGeocodeLabel(null);
                  setGeocodeErr(null);
                }}
                className="text-xs font-medium text-[var(--color-teal)] hover:text-[var(--color-teal-deep)] underline"
              >
                {tc("changeAddress")}
              </button>
              {geocodeLabel ? (
                <span className="text-[11px] text-[var(--color-muted)] truncate max-w-full">{geocodeLabel}</span>
              ) : null}
            </div>
          ) : null}

          {!userPosition ? (
            <form onSubmit={handleGeocode} className="space-y-4">
              <label className="block space-y-1">
                <span className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                  {tc("homeAddressLabel")}
                </span>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder={tc("homeAddressPlaceholder")}
                  autoComplete="street-address"
                  disabled={!canUseApis || geocodeLoading}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2.5 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                    {tc("cityLabel")}
                  </span>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={tc("cityPlaceholder")}
                    autoComplete="address-level2"
                    disabled={!canUseApis || geocodeLoading}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2.5 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                    {tc("stateLabel")}
                  </span>
                  <select
                    value={usState}
                    onChange={(e) => setUsState(e.target.value)}
                    aria-label={tc("stateLabel")}
                    autoComplete="address-level1"
                    disabled={!canUseApis || geocodeLoading}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2.5 text-sm text-[var(--color-navy)] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                  >
                    {STATE_SELECT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                    {tc("zipLabel")}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder={tc("zipPlaceholder")}
                    autoComplete="postal-code"
                    disabled={!canUseApis || geocodeLoading}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2.5 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                  />
                </label>
              </div>
              {geocodeErr ? (
                <div className="text-sm text-red-300 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
                  {geocodeErr}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={
                  geocodeLoading ||
                  !canUseApis ||
                  !street.trim() ||
                  !city.trim() ||
                  !usState ||
                  !zip.trim()
                }
                className="rounded-lg bg-[var(--color-teal-deep)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {geocodeLoading ? tc("geocoding") : tc("findOrganizationsButton")}
              </button>
            </form>
          ) : null}
        </section>

        {userPosition ? (
          <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/90 p-6 space-y-3">
            <h2 className="text-base font-semibold text-[var(--color-navy)]">{tc("mapSectionTitle")}</h2>
            <FindOrganizationsMapSection
              copy={mapCopy}
              referCaseId={caseId || undefined}
              presetUserPosition={userPosition}
              mapUserLabel={tc("homePinLabel")}
            />
          </section>
        ) : null}

        <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/90 p-6 space-y-4">
          <h2 className="text-base font-semibold text-[var(--color-navy)]">{tc("emailInsteadTitle")}</h2>
          <p className="text-sm text-[var(--color-muted)]">{tc("emailInsteadBody")}</p>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                {tc("advocateEmailLabel")}
              </span>
              <input
                type="email"
                value={advocateEmail}
                onChange={(e) => setAdvocateEmail(e.target.value)}
                placeholder="advocate@agency.org"
                required
                disabled={!canSubmitEmail || emailLoading}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2.5 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
              />
            </label>
            {emailErr ? (
              <div className="text-sm text-red-300 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
                {emailErr}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={emailLoading || !advocateEmail.trim() || !canSubmitEmail}
              className="w-full rounded-lg bg-[var(--color-teal-deep)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {emailLoading ? tc("sending") : tc("sendRequest")}
            </button>
          </form>
        </section>

        <p className="text-xs text-[var(--color-muted)]">
          {tc("findOrgsFooterPrefix")}{" "}
          <Link
            href={
              caseId
                ? `${ROUTES.applicantFindOrganizations}?case=${encodeURIComponent(caseId)}`
                : ROUTES.applicantFindOrganizations
            }
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            {tc("findOrgsLink")}
          </Link>{" "}
          {tc("findOrgsFooterSuffix")}
        </p>
      </div>
    </main>
  );
}

export default function ConnectAdvocatePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 py-8">
          <div className="max-w-lg mx-auto text-sm text-[var(--color-muted)]">Loading…</div>
        </main>
      }
    >
      <ConnectAdvocateForm />
    </Suspense>
  );
}
