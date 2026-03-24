"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { distanceMiles } from "@/lib/geo/haversine";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import type { MapOrgMarker } from "@/components/victim/OrganizationsMap";
import { orgMatchesSelectedState, US_STATE_OPTIONS } from "@/lib/geo/usStates";

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
  states: string[];
};

type Copy = {
  mapIntro: string;
  stateFilterLabel: string;
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
  noOrgsInState: string;
  loadError: string;
  privacyNote: string;
  requestJoin: string;
  requestSent: string;
  requestBusy: string;
  requestError: string;
  orgPickerLabel: string;
  orgSearchPlaceholder: string;
  orgSearchNoMatches: string;
  orgSelectedTitle: string;
};

function geoErrorMessage(
  err: GeolocationPositionError,
  copy: Pick<Copy, "locationTimeout" | "positionUnavailable" | "locationUnavailable">
): string {
  if (err.code === err.TIMEOUT) return copy.locationTimeout;
  if (err.code === err.POSITION_UNAVAILABLE) return copy.positionUnavailable;
  return copy.locationUnavailable;
}

export function AdvocateConnectOrganizationsSection({
  copy,
  initialStateCode,
  accessToken,
}: {
  copy: Copy;
  /** From advocate profile work_state (e.g. IL) */
  initialStateCode: string | null;
  accessToken: string | null;
}) {
  const [raw, setRaw] = useState<OrgFromApi[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "granted" | "denied" | "error">(
    "idle"
  );
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedState, setSelectedState] = useState<string>(initialStateCode ?? "");
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestMsg, setRequestMsg] = useState<string | null>(null);
  const [requestErr, setRequestErr] = useState<string | null>(null);
  const [orgSearchQuery, setOrgSearchQuery] = useState("");
  const [comboOpen, setComboOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const comboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialStateCode) setSelectedState(initialStateCode);
  }, [initialStateCode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadErr(null);
      if (!accessToken) {
        if (!cancelled) setLoadErr(copy.loadError);
        return;
      }
      try {
        const res = await fetch("/api/advocate/organizations-map", {
          headers: { Authorization: `Bearer ${accessToken}` },
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
  }, [accessToken, copy.loadError, retryKey]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const stateFiltered = useMemo(() => {
    if (!raw) return null;
    if (!selectedState) return raw;
    return raw.filter((o) => orgMatchesSelectedState(o.states ?? [], selectedState));
  }, [raw, selectedState]);

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
    if (!stateFiltered || !userPos) return null;
    const withDist = stateFiltered.map((o) => ({
      ...o,
      distanceMiles: distanceMiles(userPos.lat, userPos.lng, o.lat, o.lng),
    }));
    withDist.sort((a, b) => a.distanceMiles - b.distanceMiles);
    return withDist;
  }, [stateFiltered, userPos]);

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

  const displayOrgs = useMemo(() => {
    if (!stateFiltered?.length) return [];
    if (userPos && sorted?.length) return sorted;
    return stateFiltered.map((o) => ({ ...o, distanceMiles: undefined as number | undefined }));
  }, [stateFiltered, sorted, userPos]);

  const selectedOrg = useMemo(
    () => (selectedOrgId ? displayOrgs.find((o) => o.id === selectedOrgId) ?? null : null),
    [displayOrgs, selectedOrgId]
  );

  useEffect(() => {
    if (!selectedOrgId) return;
    const stillThere = displayOrgs.some((o) => o.id === selectedOrgId);
    if (!stillThere) {
      setSelectedOrgId(null);
      setOrgSearchQuery("");
    }
  }, [displayOrgs, selectedOrgId]);

  const searchFilteredOrgs = useMemo(() => {
    if (!displayOrgs.length) return [];
    const q = orgSearchQuery.trim().toLowerCase();
    if (!q) return displayOrgs;
    return displayOrgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.region_label.toLowerCase().includes(q) ||
        o.capacity_status.toLowerCase().includes(q)
    );
  }, [displayOrgs, orgSearchQuery]);

  const submitJoinRequest = async (organizationId: string) => {
    setRequestErr(null);
    setRequestMsg(null);
    if (!accessToken) {
      setRequestErr(copy.requestError);
      return;
    }
    setRequestingId(organizationId);
    try {
      const res = await fetch("/api/advocate/org-join-request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ organization_id: organizationId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRequestErr(getApiErrorMessage(json, copy.requestError));
        return;
      }
      setRequestMsg(copy.requestSent);
    } catch {
      setRequestErr(copy.requestError);
    } finally {
      setRequestingId(null);
    }
  };

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

      <label className="flex flex-col gap-1.5 sm:max-w-xs">
        <span className="text-xs font-medium text-slate-400">{copy.stateFilterLabel}</span>
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        >
          {US_STATE_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {stateFiltered && stateFiltered.length === 0 ? (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
          {copy.noOrgsInState}
        </div>
      ) : null}

      {requestMsg ? (
        <p className="text-sm text-emerald-300/95" role="status">
          {requestMsg}
        </p>
      ) : null}
      {requestErr ? (
        <p className="text-sm text-red-300/95" role="alert">
          {requestErr}
        </p>
      ) : null}

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
        </>
      ) : null}

      {displayOrgs.length > 0 ? (
        <div className="space-y-4">
          <div className="relative" ref={comboRef}>
            <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="advocate-org-combo">
              {copy.orgPickerLabel}
            </label>
            <input
              id="advocate-org-combo"
              type="search"
              autoComplete="off"
              role="combobox"
              aria-expanded={comboOpen}
              aria-controls="advocate-org-listbox"
              aria-autocomplete="list"
              value={orgSearchQuery}
              onChange={(e) => {
                const v = e.target.value;
                setOrgSearchQuery(v);
                setComboOpen(true);
                if (selectedOrg && v !== selectedOrg.name) {
                  setSelectedOrgId(null);
                }
              }}
              onFocus={() => setComboOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setComboOpen(false);
              }}
              placeholder={copy.orgSearchPlaceholder}
              disabled={Boolean(requestMsg)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-500/60 focus:outline-none focus:ring-1 focus:ring-teal-500/40 disabled:opacity-60"
            />
            {comboOpen && !requestMsg ? (
              <ul
                id="advocate-org-listbox"
                role="listbox"
                className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-600 bg-slate-950 py-1 shadow-xl shadow-black/40"
              >
                {searchFilteredOrgs.length === 0 ? (
                  <li className="px-3 py-2.5 text-xs text-slate-500">{copy.orgSearchNoMatches}</li>
                ) : (
                  searchFilteredOrgs.map((o) => {
                    const dist =
                      typeof o.distanceMiles === "number"
                        ? `${o.distanceMiles.toFixed(1)} ${copy.milesAway}`
                        : null;
                    return (
                      <li key={o.id} role="option" aria-selected={selectedOrgId === o.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-800/90 focus:bg-slate-800 focus:outline-none"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSelectedOrgId(o.id);
                            setOrgSearchQuery(o.name);
                            setComboOpen(false);
                          }}
                        >
                          <div className="font-medium text-slate-100 truncate">{o.name}</div>
                          <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-slate-500">
                            <span className="truncate">{o.region_label}</span>
                            {dist ? (
                              <span>
                                {dist}
                                {o.approximate ? ` · ${copy.approximateNote}` : ""}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            ) : null}
          </div>

          {selectedOrg ? (
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
                {copy.orgSelectedTitle}
              </p>
              <div className="font-medium text-white">{selectedOrg.name}</div>
              {typeof selectedOrg.distanceMiles === "number" ? (
                <div className="mt-1 text-xs text-slate-400">
                  {selectedOrg.distanceMiles.toFixed(1)} {copy.milesAway}
                  {selectedOrg.approximate ? ` · ${copy.approximateNote}` : ""}
                </div>
              ) : null}
              <div className="mt-1 text-xs text-slate-500">{selectedOrg.region_label}</div>
              <div className="mt-2 text-xs">
                {selectedOrg.accepting_clients ? (
                  <span className="text-emerald-400/90">{copy.accepting}</span>
                ) : (
                  <span className="text-slate-500">{copy.notAccepting}</span>
                )}
                <span className="text-slate-600"> · </span>
                <span className="text-slate-500">
                  {copy.capacity}: {selectedOrg.capacity_status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void submitJoinRequest(selectedOrg.id)}
                disabled={requestingId === selectedOrg.id || Boolean(requestMsg)}
                className="mt-4 w-full rounded-lg bg-teal-600/90 px-3 py-2.5 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50 sm:w-auto"
              >
                {requestingId === selectedOrg.id ? copy.requestBusy : copy.requestJoin}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
