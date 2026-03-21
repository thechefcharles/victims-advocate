"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

export type MapOrgMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMiles?: number;
  approximate?: boolean;
};

type Props = {
  userLat: number;
  userLng: number;
  orgs: MapOrgMarker[];
  userLabel: string;
  orgPopupSuffix?: string;
};

/**
 * OpenStreetMap tiles + Leaflet. Renders user location + org markers; parent handles SSR (dynamic import).
 */
export function OrganizationsMap({ userLat, userLng, orgs, userLabel, orgPopupSuffix }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let map: LeafletMap | null = null;

    void (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, {
        scrollWheelZoom: true,
      }).setView([userLat, userLng], 9);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      L.circleMarker([userLat, userLng], {
        radius: 10,
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 0.9,
        weight: 2,
      })
        .addTo(map)
        .bindPopup(`<strong>${escapeHtml(userLabel)}</strong>`);

      const bounds = L.latLngBounds(
        L.latLng(userLat, userLng),
        L.latLng(userLat, userLng)
      );

      for (const o of orgs) {
        const dist =
          o.distanceMiles != null ? ` · ${o.distanceMiles.toFixed(1)} mi` : "";
        const approx =
          o.approximate && orgPopupSuffix ? ` · ${orgPopupSuffix}` : "";
        const m = L.marker([o.lat, o.lng]).addTo(map);
        m.bindPopup(
          `<strong>${escapeHtml(o.name)}</strong>${escapeHtml(dist)}${escapeHtml(approx)}`
        );
        bounds.extend([o.lat, o.lng]);
      }

      if (orgs.length > 0) {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 11 });
      }

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, [userLat, userLng, orgs, userLabel, orgPopupSuffix]);

  return (
    <div
      ref={containerRef}
      className="h-[min(420px,55vh)] min-h-[280px] w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
      aria-hidden
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
