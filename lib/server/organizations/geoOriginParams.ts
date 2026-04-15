/**
 * Parses lat/lng/radiusMiles/limit from a URLSearchParams (query string).
 *
 * Returns null if lat/lng are missing or not finite, so callers can fall back
 * to the non-geo listing. Spec rule: the frontend never filters by geography —
 * it only forwards these params, and the server performs all filtering.
 */
import type { GeoOrigin } from "./organizationsMapData";

export function parseGeoOriginParams(params: URLSearchParams): GeoOrigin | null {
  const latRaw = params.get("lat");
  const lngRaw = params.get("lng");
  if (latRaw == null || lngRaw == null) return null;

  const lat = Number.parseFloat(latRaw);
  const lng = Number.parseFloat(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const radiusRaw = params.get("radiusMiles");
  const limitRaw = params.get("limit");
  const radiusParsed = radiusRaw != null ? Number.parseFloat(radiusRaw) : NaN;
  const limitParsed = limitRaw != null ? Number.parseInt(limitRaw, 10) : NaN;

  return {
    lat,
    lng,
    radiusMiles:
      Number.isFinite(radiusParsed) && radiusParsed > 0 && radiusParsed <= 500
        ? radiusParsed
        : undefined,
    limit:
      Number.isFinite(limitParsed) && limitParsed > 0 && limitParsed <= 1000
        ? limitParsed
        : undefined,
  };
}
