"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { distanceMiles } from "@/lib/geo/haversine";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import type { MapOrgMarker } from "@/components/victim/OrganizationsMap";

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
};

function geoErrorMessage(
  err: GeolocationPositionError,
  copy: Pick<Copy, "locationTimeout" | "positionUnavailable" | "locationUnavailable">
): string {
  if (err.code === err.TIMEOUT) return copy.locationTimeout;
  if (err.code === err.POSITION_UNAVAILABLE) return copy.positionUnavailable;
  return copy.locationUnavailable;
}

export function FindOrganizationsMapSection({ copy }: { copy: Copy }) {
  const [raw, setRaw] = useState<OrgFromApi[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "granted" | "denied" | "error">(
    "idle"
  );
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [retryKey, setRetryKey] = useState(0);

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
      setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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
    if (!raw || !userPos) return null;
    const withDist = raw.map((o) => ({
      ...o,
      distanceMiles: distanceMiles(userPos.lat, userPos.lng, o.lat, o.lng),
    }));
    withDist.sort((a, b) => a.distanceMiles - b.distanceMiles);
    return withDist;
  }, [raw, userPos]);

  const mapOrgs: MapOrgMarker[] = useMemo(() => {
    if (!sorted) return [];
    return sorted.map((o) => ({
      id: o.id,
      name: o.name,
      lat: o.lat,
      lng: o.lng,
      distanceMiles: o.distanceMiles,
      approximate: o.approximate,
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

      {geoStatus === "idle" || geoStatus === "denied" || geoStatus === "error" ? (
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

      {geoStatus === "requesting" ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-400">{copy.sharing}</p>
          <MapSkeleton />
        </div>
      ) : null}

      {userPos && sorted && sorted.length > 0 ? (
        <>
          <OrganizationsMap
            key={mapOrgsKey + `${userPos.lat}:${userPos.lng}`}
            userLat={userPos.lat}
            userLng={userPos.lng}
            orgs={mapOrgs}
            userLabel={copy.yourLocation}
            orgPopupSuffix={copy.approximateNote}
          />
          <ul className="space-y-2 text-sm">
            {sorted.map((o) => (
              <li
                key={o.id}
                className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-slate-200"
              >
                <div className="font-medium text-white">{o.name}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {o.distanceMiles.toFixed(1)} {copy.milesAway}
                  {o.approximate ? ` · ${copy.approximateNote}` : ""}
                </div>
                <div className="mt-1 text-xs text-slate-500">{o.region_label}</div>
                <div className="mt-1 text-xs">
                  {o.accepting_clients ? (
                    <span className="text-emerald-400/90">{copy.accepting}</span>
                  ) : (
                    <span className="text-slate-500">{copy.notAccepting}</span>
                  )}
                  <span className="text-slate-600"> · </span>
                  <span className="text-slate-500">
                    {copy.capacity}: {o.capacity_status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

    </div>
  );
}
