/**
 * GET /api/search/programs — PUBLIC program search.
 * No required params; all filters optional.
 */

import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { searchPrograms } from "@/lib/server/search/programSearchService";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const latRaw = url.searchParams.get("lat");
    const lngRaw = url.searchParams.get("lng");
    const lat = latRaw != null ? Number.parseFloat(latRaw) : null;
    const lng = lngRaw != null ? Number.parseFloat(lngRaw) : null;

    const result = await searchPrograms({
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      radiusKm: Number.parseFloat(url.searchParams.get("radius_km") ?? "25"),
      programType: url.searchParams.get("program_type") ?? undefined,
      crimeType: url.searchParams.get("crime_type") ?? undefined,
      language: url.searchParams.get("language") ?? undefined,
      cursor: url.searchParams.get("cursor"),
      limit: Number.parseInt(url.searchParams.get("limit") ?? "20", 10),
    });

    return apiOk(
      { programs: result.programs },
      { nextCursor: result.nextCursor, limit: result.limit },
    );
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("search.programs.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
