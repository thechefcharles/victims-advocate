/**
 * GET /api/search/providers — PUBLIC provider search.
 *   Required: lat, lng
 *   Optional: radius_km (default 25, max 100), service_types (csv),
 *             crime_type, language, accepting_clients (default true),
 *             cursor, limit (default 20, max 50)
 *
 * Returns tier labels only — never overall_score or raw signal data.
 * No auth — applicants may search before creating an account.
 */

import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { searchProviders } from "@/lib/server/search/providerSearchService";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const latRaw = url.searchParams.get("lat");
    const lngRaw = url.searchParams.get("lng");
    const lat = latRaw != null ? Number.parseFloat(latRaw) : NaN;
    const lng = lngRaw != null ? Number.parseFloat(lngRaw) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return apiFail("VALIDATION_ERROR", "lat and lng are required numeric query params.");
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return apiFail("VALIDATION_ERROR", "lat/lng out of range.");
    }

    const radiusKm = Number.parseFloat(url.searchParams.get("radius_km") ?? "25");
    const serviceTypesRaw = url.searchParams.get("service_types");
    const serviceTypes = serviceTypesRaw
      ? serviceTypesRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const crimeType = url.searchParams.get("crime_type") ?? undefined;
    const language = url.searchParams.get("language") ?? undefined;
    const acceptingRaw = url.searchParams.get("accepting_clients");
    const acceptingClients =
      acceptingRaw == null ? true : acceptingRaw.toLowerCase() !== "false";
    const cursor = url.searchParams.get("cursor");
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);

    const result = await searchProviders({
      lat,
      lng,
      radiusKm,
      serviceTypes,
      crimeType,
      language,
      acceptingClients,
      cursor,
      limit: Number.isFinite(limit) ? limit : 20,
    });

    return apiOk(
      { providers: result.providers },
      {
        nextCursor: result.nextCursor,
        limit: result.limit,
        totalInRadius: result.totalInRadius,
      },
    );
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("search.providers.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
