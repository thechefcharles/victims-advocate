import { statesFromCoverage } from "@/lib/server/ecosystem/regions";
import { centroidForState } from "@/lib/geo/stateCentroids";

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

export type OrgMapPoint = {
  lat: number;
  lng: number;
  /** True when lat/lng are derived from coverage / centroid, not from org-supplied coordinates. */
  approximate: boolean;
};

/**
 * Prefer `metadata.public_lat` / `metadata.public_lng` (or `map_lat` / `map_lng`) when set.
 * Otherwise place near the first listed coverage state’s centroid with a stable per-org offset.
 */
export function computeOrgMapPoint(org: {
  id: string;
  coverage_area: unknown;
  metadata: unknown;
}): OrgMapPoint {
  const meta =
    org.metadata && typeof org.metadata === "object"
      ? (org.metadata as Record<string, unknown>)
      : {};
  const lat = Number(meta.public_lat ?? meta.map_lat);
  const lng = Number(meta.public_lng ?? meta.map_lng);
  if (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  ) {
    return { lat, lng, approximate: false };
  }

  const states = statesFromCoverage(org.coverage_area as Record<string, unknown>);
  const c = centroidForState(states[0] ?? null);
  const { dLat, dLng } = offsetFromId(org.id);
  return { lat: c.lat + dLat, lng: c.lng + dLng, approximate: true };
}
