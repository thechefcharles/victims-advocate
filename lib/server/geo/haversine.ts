/**
 * Server-only haversine distance helper.
 *
 * PostGIS is the source of truth for distances against rows in
 * provider_search_index. This helper is used ONLY to compute distances
 * against server-side records that are not in the search index (e.g. the
 * external CBO/VA directory JSON). Under no circumstance may this be
 * imported into client/`app/` code — geo math in the browser is banned.
 *
 * Earth radius in miles.
 */
const R_MI = 3958.8;
const MI_PER_METER = 0.000621371;

export function distanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_MI * c;
}

export function metersToMiles(meters: number): number {
  return meters * MI_PER_METER;
}

export function milesToMeters(miles: number): number {
  return miles / MI_PER_METER;
}
