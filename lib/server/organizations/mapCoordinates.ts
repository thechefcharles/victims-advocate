import { statesFromCoverage } from "@/lib/server/ecosystem/regions";
import { centroidForState } from "@/lib/geo/stateCentroids";

/**
 * How org pins get coordinates (in order):
 *
 * 1. **Explicit coordinates on the org** — `organizations.metadata` JSON:
 *    `public_lat` / `public_lng` (preferred), or `map_lat` / `map_lng`, or `latitude` / `longitude`,
 *    or `lat` / `lng`, or `geo_lat` / `geo_lng`. These should come from geocoding the real address
 *    (admin/import); we do not geocode street addresses on the fly in this path.
 *
 * 2. **Optional geo on `coverage_area`** — if `coverage_area.lat` and `coverage_area.lng` are set
 *    (or `coverage_area.center` is `{ lat, lng }`), we use that as non-approximate when valid.
 *
 * 3. **Fallback (marked approximate)** — geographic **center of the first state** listed in
 *    `coverage_area.states` / `coverage_area.state` (see `STATE_CENTROIDS`), plus a small
 *    deterministic offset from org `id` so pins don’t stack. This is only state-level, so a
 *    Chicago agency with only `IL` in coverage will appear near the middle of Illinois, not Chicago.
 */

/** Deterministic pseudo-random offset so multiple orgs in the same state don’t stack on one pixel. */
function offsetFromId(id: string): { dLat: number; dLng: number } {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = (h >>> 0) / 0xffffffff;
  const v = (Math.imul(h, 31) >>> 0) / 0xffffffff;
  // ~±0.35° lng, ±0.22° lat — keeps pins in-state-ish
  return { dLat: (v - 0.5) * 0.44, dLng: (u - 0.5) * 0.7 };
}

function readLatLngPair(r: Record<string, unknown>): { lat: number; lng: number } | null {
  const pairs: [string, string][] = [
    ["public_lat", "public_lng"],
    ["map_lat", "map_lng"],
    ["latitude", "longitude"],
    ["lat", "lng"],
    ["geo_lat", "geo_lng"],
  ];
  for (const [ak, bk] of pairs) {
    const lat = Number(r[ak]);
    const lng = Number(r[bk]);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180
    ) {
      return { lat, lng };
    }
  }
  return null;
}

function coordsFromCoverageArea(coverage: Record<string, unknown>): { lat: number; lng: number } | null {
  const direct = readLatLngPair(coverage);
  if (direct) return direct;
  const center = coverage.center;
  if (center && typeof center === "object" && !Array.isArray(center)) {
    return readLatLngPair(center as Record<string, unknown>);
  }
  return null;
}

export type OrgMapPoint = {
  lat: number;
  lng: number;
  /** True when lat/lng are derived from coverage / centroid, not from org-supplied coordinates. */
  approximate: boolean;
};

export function computeOrgMapPoint(org: {
  id: string;
  coverage_area: unknown;
  metadata: unknown;
}): OrgMapPoint {
  const meta =
    org.metadata && typeof org.metadata === "object"
      ? (org.metadata as Record<string, unknown>)
      : {};
  const fromMeta = readLatLngPair(meta);
  if (fromMeta) {
    return { lat: fromMeta.lat, lng: fromMeta.lng, approximate: false };
  }

  const cov =
    org.coverage_area && typeof org.coverage_area === "object" && !Array.isArray(org.coverage_area)
      ? (org.coverage_area as Record<string, unknown>)
      : {};
  const fromCoverage = coordsFromCoverageArea(cov);
  if (fromCoverage) {
    return { lat: fromCoverage.lat, lng: fromCoverage.lng, approximate: false };
  }

  const states = statesFromCoverage(cov);
  const c = centroidForState(states[0] ?? null);
  const { dLat, dLng } = offsetFromId(org.id);
  return { lat: c.lat + dLat, lng: c.lng + dLng, approximate: true };
}
