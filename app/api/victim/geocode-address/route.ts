/**
 * Geocode a US home address for victim flows (e.g. org map near me).
 * Uses Nominatim; honor their usage policy (low volume, identifiable User-Agent).
 */

import { getAuthContext, requireAuth, requireRole } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

type NominatimHit = { lat?: string; lon?: string; display_name?: string };

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireRole(ctx, "victim");

    const body = (await req.json().catch(() => null)) as {
      street?: unknown;
      city?: unknown;
      state?: unknown;
      zip?: unknown;
    } | null;
    const street = typeof body?.street === "string" ? body.street.trim() : "";
    const city = typeof body?.city === "string" ? body.city.trim() : "";
    const stateRaw = typeof body?.state === "string" ? body.state.trim().toUpperCase() : "";
    const zipRaw = typeof body?.zip === "string" ? body.zip.trim() : "";
    const zipDigits = zipRaw.replace(/\D/g, "").slice(0, 5);

    if (!street || street.length < 3) {
      return apiFail("VALIDATION_ERROR", "Enter your street address.", undefined, 400);
    }
    if (!city || city.length < 2) {
      return apiFail("VALIDATION_ERROR", "Enter your city.", undefined, 400);
    }
    if (!/^[A-Z]{2}$/.test(stateRaw)) {
      return apiFail("VALIDATION_ERROR", "Choose a valid two-letter state code.", undefined, 400);
    }
    if (zipDigits.length !== 5) {
      return apiFail("VALIDATION_ERROR", "Enter a valid 5-digit ZIP code.", undefined, 400);
    }

    const query = `${street}, ${city}, ${stateRaw} ${zipDigits}, United States`;
    const url = new URL(NOMINATIM);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("q", query);

    const ua =
      process.env.NOMINATIM_USER_AGENT?.trim() ||
      "NxtStps/1.0 (victim geocode; contact: https://nxtstps.com)";

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": ua,
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      logger.warn("victim.geocode-address.nominatim_http", { status: res.status });
      return apiFail("UPSTREAM_ERROR", "Address lookup failed. Try again in a moment.", undefined, 502);
    }

    const data = (await res.json().catch(() => null)) as unknown;
    if (!Array.isArray(data) || data.length === 0) {
      return apiFail(
        "NOT_FOUND",
        "We couldn’t place that address on the map. Check the street and ZIP and try again.",
        undefined,
        404
      );
    }

    const hit = data[0] as NominatimHit;
    const lat = hit.lat != null ? Number.parseFloat(String(hit.lat)) : NaN;
    const lng = hit.lon != null ? Number.parseFloat(String(hit.lon)) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return apiFail("INTERNAL", "Address lookup returned an unexpected response. Try again in a moment.", undefined, 502);
    }

    return apiOk({
      lat,
      lng,
      display_name: typeof hit.display_name === "string" ? hit.display_name : undefined,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("victim.geocode-address.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
