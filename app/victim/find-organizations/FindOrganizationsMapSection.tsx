"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { distanceMiles } from "@/lib/geo/haversine";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import type { MapOrgMarker } from "@/components/victim/OrganizationsMap";
import { OrganizationLearnMoreModal } from "@/components/victim/OrganizationLearnMoreModal";
import { ROUTES, victimConnectOrganizationHelpUrl } from "@/lib/routes/pageRegistry";
import type { ResponseAccessibilityPublic } from "@/lib/organizations/responseAccessibilityPublic";

const OrganizationsMap = dynamic(
  () =>
    import("@/components/victim/OrganizationsMap").then((m) => m.OrganizationsMap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

function MapSkeleton() {
  return (
    <div className="h-[min(420px,55vh)] min-h-[280px] w-full animate-pulse rounded-xl border border-slate-700 bg-slate-800/80" />
  );
}

export type OrgFromApi = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  approximate: boolean;
  accepting_clients: boolean;
  capacity_status: string;
  region_label: string;
  /** USPS state codes from org coverage (empty = unspecified geography). */
  states: string[];
  external?: boolean;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  program_type?: string | null;
  response_accessibility?: ResponseAccessibilityPublic | null;
};

type Copy = {
  mapIntro: string;
  shareLocation: string;
  sharing: string;
  tryAgain: string;
  locationDenied: string;
  locationUnavailable: string;
  locationTimeout: string;
  positionUnavailable: string;
  locationNotSupported: string;
  locationNeedsHttps: string;
  yourLocation: string;
  approximateNote: string;
  milesAway: string;
  accepting: string;
  notAccepting: string;
  capacity: string;
  noOrgs: string;
  loadError: string;
  privacyNote: string;
  sendReferral: string;
  sendReferralSending: string;
  sendReferralDone: string;
  sendReferralFailed: string;
  sendReferralDuplicate: string;
  learnMoreTitle: string;
  learnMore: string;
  learnMoreClose: string;
  organizationProfile: string;
  connectWithOrg: string;
  externalDirectoryNote: string;
  profileUnavailableExternal: string;
  connectUnavailableExternal: string;
  directoryProgramType: string;
  directoryAddress: string;
  directoryPhone: string;
  directoryWebsite: string;
  fieldPendingExternal: string;
  fieldPendingFallback: string;
  directoryContactHeading: string;
};

function referralPostErrorMessage(
  json: unknown,
  copy: Pick<Copy, "sendReferralFailed" | "sendReferralDuplicate">
): string {
  if (json && typeof json === "object") {
    const err = (json as Record<string, unknown>).error;
    if (err && typeof err === "object") {
      const details = (err as Record<string, unknown>).details;
      if (details && typeof details === "object") {
        const reason = (details as Record<string, unknown>).reason;
        if (reason === "referral_duplicate_pending") return copy.sendReferralDuplicate;
      }
    }
  }
  return getApiErrorMessage(json, copy.sendReferralFailed);
}

function externalDirectoryPills(o: OrgFromApi, copy: Copy): { label: string; value: string }[] {
  const pills: { label: string; value: string }[] = [];
  if (o.program_type?.trim()) {
    pills.push({ label: copy.directoryProgramType, value: o.program_type.trim() });
  }
  if (o.address?.trim()) {
    pills.push({ label: copy.directoryAddress, value: o.address.trim() });
  }
  if (o.phone?.trim()) {
    pills.push({ label: copy.directoryPhone, value: o.phone.trim() });
  }
  const web = safeHttpUrl(o.website);
  if (web && o.website?.trim()) {
    pills.push({
      label: copy.directoryWebsite,
      value: o.website!.replace(/^https?:\/\//i, ""),
    });
  }
  return pills;
}

function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

function geoErrorMessage(
  err: GeolocationPositionError,
  copy: Pick<Copy, "locationTimeout" | "positionUnavailable" | "locationUnavailable">
): string {
  if (err.code === err.TIMEOUT) return copy.locationTimeout;
  if (err.code === err.POSITION_UNAVAILABLE) return copy.positionUnavailable;
  return copy.locationUnavailable;
}

export function FindOrganizationsMapSection({
  copy,
  referCaseId,
  presetUserPosition,
  mapUserLabel,
}: {
  copy: Copy;
  /** When set (e.g. from `?case=`), show “Send referral” for each listed org. */
  referCaseId?: string;
  /** When set, skip browser geolocation and center the map on this point (e.g. geocoded home address). */
  presetUserPosition?: { lat: number; lng: number } | null;
  /** Label for the user marker on the map (defaults to copy.yourLocation). */
  mapUserLabel?: string;
}) {
  const [raw, setRaw] = useState<OrgFromApi[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "granted" | "denied" | "error">(
    "idle"
  );
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [geoUserPos, setGeoUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [referBusyId, setReferBusyId] = useState<string | null>(null);
  const [referFeedback, setReferFeedback] = useState<{ orgId: string; text: string } | null>(null);
  const [learnMoreOrg, setLearnMoreOrg] = useState<OrgFromApi | null>(null);

  const userLabelOnMap = mapUserLabel ?? copy.yourLocation;
  const usePresetLocation = presetUserPosition != null;
  const mapCenterPos = presetUserPosition ?? geoUserPos;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadErr(null);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        if (!cancelled) setLoadErr(copy.loadError);
        return;
      }
      try {
        const res = await fetch("/api/victim/organizations-map", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setLoadErr(getApiErrorMessage(json, copy.loadError));
          return;
        }
        const orgs = json?.data?.organizations as OrgFromApi[] | undefined;
        if (!cancelled) setRaw(Array.isArray(orgs) ? orgs : []);
      } catch {
        if (!cancelled) setLoadErr(copy.loadError);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [copy.loadError, retryKey]);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("error");
      setGeoErr(
        typeof window !== "undefined" && !window.isSecureContext
          ? copy.locationNeedsHttps
          : copy.locationNotSupported
      );
      return;
    }
    setGeoStatus("requesting");
    setGeoErr(null);

    const onSuccess = (pos: GeolocationPosition) => {
      setGeoUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setGeoStatus("granted");
    };

    const onFinalError = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setGeoStatus("denied");
        return;
      }
      setGeoStatus("error");
      setGeoErr(geoErrorMessage(err, copy));
    };

    const onFirstError = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setGeoStatus("denied");
        return;
      }
      navigator.geolocation.getCurrentPosition(onSuccess, onFinalError, {
        enableHighAccuracy: false,
        timeout: 35_000,
        maximumAge: 300_000,
      });
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onFirstError, {
      enableHighAccuracy: true,
      timeout: 25_000,
      maximumAge: 60_000,
    });
  }, [copy]);

  const sorted = useMemo(() => {
    if (!raw || !mapCenterPos) return null;
    const withDist = raw.map((o) => ({
      ...o,
      distanceMiles: distanceMiles(mapCenterPos.lat, mapCenterPos.lng, o.lat, o.lng),
    }));
    withDist.sort((a, b) => a.distanceMiles - b.distanceMiles);
    return withDist;
  }, [raw, mapCenterPos]);

  const mapOrgs: MapOrgMarker[] = useMemo(() => {
    if (!sorted) return [];
    return sorted.map((o) => ({
      id: o.id,
      name: o.name,
      lat: o.lat,
      lng: o.lng,
      distanceMiles: o.distanceMiles,
      approximate: o.approximate,
      address: o.address,
      phone: o.phone,
      website: o.website,
      program_type: o.program_type,
    }));
  }, [sorted]);

  const mapOrgsKey = useMemo(
    () => mapOrgs.map((o) => `${o.id}:${o.lat}:${o.lng}:${o.distanceMiles ?? ""}`).join("|"),
    [mapOrgs]
  );

  if (loadErr) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-red-900/40 bg-red-950/25 px-4 py-3 text-sm text-red-200">
          {loadErr}
        </div>
        <button
          type="button"
          onClick={() => {
            setLoadErr(null);
            setRaw(null);
            setRetryKey((k) => k + 1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          {copy.tryAgain}
        </button>
      </div>
    );
  }

  if (raw === null) {
    return <MapSkeleton />;
  }

  if (raw.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-300 leading-relaxed">{copy.mapIntro}</p>
        <div
          className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-300"
          role="status"
        >
          {copy.noOrgs}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{copy.privacyNote}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300 leading-relaxed">{copy.mapIntro}</p>
      <p className="text-xs text-slate-500 leading-relaxed">{copy.privacyNote}</p>

      {!usePresetLocation &&
      (geoStatus === "idle" || geoStatus === "denied" || geoStatus === "error") ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={requestLocation}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-950/30 hover:bg-blue-500"
          >
            {geoStatus === "error" ? copy.tryAgain : copy.shareLocation}
          </button>
          {geoStatus === "denied" ? (
            <p className="text-sm text-amber-200/90">{copy.locationDenied}</p>
          ) : null}
          {geoStatus === "error" && geoErr ? (
            <p className="text-sm text-amber-200/90">{geoErr}</p>
          ) : null}
        </div>
      ) : null}

      {!usePresetLocation && geoStatus === "requesting" ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-400">{copy.sharing}</p>
          <MapSkeleton />
        </div>
      ) : null}

      {mapCenterPos && sorted && sorted.length > 0 ? (
        <>
          <OrganizationsMap
            key={mapOrgsKey + `${mapCenterPos.lat}:${mapCenterPos.lng}`}
            userLat={mapCenterPos.lat}
            userLng={mapCenterPos.lng}
            orgs={mapOrgs}
            userLabel={userLabelOnMap}
            orgPopupSuffix={copy.approximateNote}
          />
          <ul className="space-y-2 text-sm">
            {sorted.map((o) => (
              <li
                key={o.id}
                className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-slate-200"
              >
                <div className="font-medium text-white">{o.name}</div>
                {o.program_type ? (
                  <div className="mt-0.5 text-xs text-slate-400">{o.program_type}</div>
                ) : null}
                <div className="mt-1 text-xs text-slate-400">
                  {o.distanceMiles.toFixed(1)} {copy.milesAway}
                  {o.approximate ? ` · ${copy.approximateNote}` : ""}
                </div>
                <div className="mt-1 text-xs text-slate-500">{o.region_label}</div>
                {o.address ? (
                  <div className="mt-1 text-xs text-slate-400 leading-snug">{o.address}</div>
                ) : null}
                {o.phone ? (
                  <div className="mt-1 text-xs">
                    {o.phone.replace(/\D/g, "").length >= 7 ? (
                      <a
                        href={`tel:${o.phone.replace(/[^\d+]/g, "")}`}
                        className="text-blue-300 hover:underline"
                      >
                        {o.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400">{o.phone}</span>
                    )}
                  </div>
                ) : null}
                {safeHttpUrl(o.website) ? (
                  <div className="mt-1 text-xs truncate">
                    <a
                      href={safeHttpUrl(o.website)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-300 hover:underline"
                    >
                      {o.website!.replace(/^https?:\/\//i, "")}
                    </a>
                  </div>
                ) : null}
                <div className="mt-1 text-xs">
                  {o.external ? (
                    <span className="text-slate-500">Directory listing</span>
                  ) : o.accepting_clients ? (
                    <span className="text-emerald-400/90">{copy.accepting}</span>
                  ) : (
                    <span className="text-slate-500">{copy.notAccepting}</span>
                  )}
                  {!o.external ? (
                    <>
                      <span className="text-slate-600"> · </span>
                      <span className="text-slate-500">
                        {copy.capacity}: {o.capacity_status}
                      </span>
                    </>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setLearnMoreOrg(o)}
                    className="rounded-lg border border-slate-600 bg-slate-800/90 px-3 py-1.5 text-[11px] font-semibold text-slate-100 hover:bg-slate-700"
                  >
                    {copy.learnMore}
                  </button>
                  {!o.external ? (
                    <Link
                      href={ROUTES.victimOrganization(o.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-500 bg-slate-800/90 px-3 py-1.5 text-[11px] font-semibold text-slate-100 hover:bg-slate-700"
                    >
                      {copy.organizationProfile}
                    </Link>
                  ) : (
                    <span
                      className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] font-semibold text-slate-500 cursor-not-allowed"
                      title={copy.profileUnavailableExternal}
                    >
                      {copy.organizationProfile}
                    </span>
                  )}
                  {!o.external ? (
                    <Link
                      href={victimConnectOrganizationHelpUrl({
                        organizationId: o.id,
                        caseId: referCaseId,
                      })}
                      className="inline-flex items-center justify-center rounded-lg bg-teal-600/90 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-teal-500"
                    >
                      {copy.connectWithOrg}
                    </Link>
                  ) : (
                    <span
                      className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] font-semibold text-slate-500 cursor-not-allowed"
                      title={copy.connectUnavailableExternal}
                    >
                      {copy.connectWithOrg}
                    </span>
                  )}
                </div>
                {referCaseId && !o.external ? (
                  <div className="mt-2">
                    {referFeedback?.orgId === o.id ? (
                      <p
                        className={`text-[11px] mb-1.5 ${
                          referFeedback.text === copy.sendReferralDone
                            ? "text-emerald-300/95"
                            : "text-amber-200/90"
                        }`}
                      >
                        {referFeedback.text}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      disabled={referBusyId !== null}
                      onClick={async () => {
                        setReferFeedback(null);
                        setReferBusyId(o.id);
                        try {
                          const { data: sessionData } = await supabase.auth.getSession();
                          const token = sessionData.session?.access_token;
                          if (!token) {
                            setReferFeedback({ orgId: o.id, text: copy.sendReferralFailed });
                            setReferBusyId(null);
                            return;
                          }
                          const res = await fetch(`/api/cases/${referCaseId}/org-referrals`, {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ to_organization_id: o.id }),
                          });
                          const json = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            setReferFeedback({
                              orgId: o.id,
                              text: referralPostErrorMessage(json, copy),
                            });
                            setReferBusyId(null);
                            return;
                          }
                          setReferFeedback({ orgId: o.id, text: copy.sendReferralDone });
                          setReferBusyId(null);
                        } catch {
                          setReferFeedback({ orgId: o.id, text: copy.sendReferralFailed });
                          setReferBusyId(null);
                        }
                      }}
                      className="rounded-lg border border-emerald-600/50 bg-emerald-950/40 px-3 py-1.5 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-900/50 disabled:opacity-50"
                    >
                      {referBusyId === o.id ? copy.sendReferralSending : copy.sendReferral}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <OrganizationLearnMoreModal
            open={learnMoreOrg !== null}
            onClose={() => setLearnMoreOrg(null)}
            orgName={learnMoreOrg?.name ?? ""}
            external={Boolean(learnMoreOrg?.external)}
            directoryContactPills={
              learnMoreOrg?.external ? externalDirectoryPills(learnMoreOrg, copy) : undefined
            }
            responseAccessibility={learnMoreOrg?.response_accessibility ?? null}
            copy={{
              title: copy.learnMoreTitle,
              close: copy.learnMoreClose,
              externalDirectoryNote: copy.externalDirectoryNote,
              fieldPendingExternal: copy.fieldPendingExternal,
              fieldPendingFallback: copy.fieldPendingFallback,
              directoryContactHeading: copy.directoryContactHeading,
            }}
          />
        </>
      ) : null}

    </div>
  );
}
