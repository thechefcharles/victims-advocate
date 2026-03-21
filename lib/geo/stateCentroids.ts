/**
 * Approximate geographic centers (lat/lng) for map placement when orgs have no pinned coordinates.
 * Source: USGS / commonly used state centroids (degrees).
 */
export const STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  IL: { lat: 40.6331, lng: -89.3985 },
  IN: { lat: 39.8494, lng: -86.2583 },
  WI: { lat: 44.2619, lng: -89.6165 },
  MI: { lat: 43.3266, lng: -84.5361 },
  OH: { lat: 40.3888, lng: -82.7649 },
  KY: { lat: 37.5347, lng: -86.7831 },
  MO: { lat: 38.3047, lng: -92.4379 },
  IA: { lat: 41.9217, lng: -93.3127 },
  MN: { lat: 45.9897, lng: -94.6113 },
  TN: { lat: 35.858, lng: -86.3505 },
};

export function centroidForState(state: string | null | undefined): { lat: number; lng: number } {
  const k = (state ?? "IL").toUpperCase();
  return STATE_CENTROIDS[k] ?? STATE_CENTROIDS.IL;
}
