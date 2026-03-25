import { getAuthContext, requireFullAccess, requireRole } from "@/lib/server/auth";
import { apiFailFromError, apiOk, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { stateInCoverage } from "@/lib/server/matching/filters";
import { getCurrentDesignationsForOrgIds } from "@/lib/server/designations/service";

type OrgSearchRow = {
  id: string;
  name: string;
  service_types: string[];
  languages: string[];
  coverage_area: Record<string, unknown>;
  accepting_clients: boolean;
  capacity_status: string;
  profile_status: string;
  profile_stage: string;
  accessibility_features: string[];
  special_populations: string[];
};

function hasQueryMatch(org: OrgSearchRow, q: string): boolean {
  const qq = q.trim().toLowerCase();
  if (!qq) return true;
  return (
    org.name.toLowerCase().includes(qq) ||
    org.service_types.some((s) => s.toLowerCase().includes(qq)) ||
    org.languages.some((l) => l.toLowerCase().includes(qq))
  );
}

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) requireRole(ctx, "advocate");

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const service = (url.searchParams.get("service") ?? "").trim().toLowerCase();
    const state = (url.searchParams.get("state") ?? "").trim().toUpperCase();
    const language = (url.searchParams.get("language") ?? "").trim().toLowerCase();
    const availability = (url.searchParams.get("availability") ?? "all").trim().toLowerCase();
    const stage = (url.searchParams.get("stage") ?? "all").trim().toLowerCase();
    const special = (url.searchParams.get("special_population") ?? "").trim().toLowerCase();
    const accessibility = (url.searchParams.get("accessibility") ?? "").trim().toLowerCase();
    const includeUnready = url.searchParams.get("include_unready") === "true" && ctx.isAdmin;

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("organizations")
      .select(
        "id,name,service_types,languages,coverage_area,accepting_clients,capacity_status,profile_status,profile_stage,accessibility_features,special_populations"
      )
      .eq("status", "active")
      .eq("profile_status", "active");

    if (!includeUnready) {
      query = query.in("profile_stage", ["searchable", "enriched"]);
    }

    const { data, error } = await query.order("name", { ascending: true }).limit(250);
    if (error) throw error;

    let rows = (data ?? []).map((r) => ({
      id: String(r.id),
      name: String(r.name ?? ""),
      service_types: Array.isArray(r.service_types) ? (r.service_types as string[]) : [],
      languages: Array.isArray(r.languages) ? (r.languages as string[]) : [],
      coverage_area:
        r.coverage_area && typeof r.coverage_area === "object" && !Array.isArray(r.coverage_area)
          ? (r.coverage_area as Record<string, unknown>)
          : {},
      accepting_clients: Boolean(r.accepting_clients),
      capacity_status: String(r.capacity_status ?? "unknown"),
      profile_status: String(r.profile_status ?? "draft"),
      profile_stage: String(r.profile_stage ?? "created"),
      accessibility_features: Array.isArray(r.accessibility_features)
        ? (r.accessibility_features as string[])
        : [],
      special_populations: Array.isArray(r.special_populations)
        ? (r.special_populations as string[])
        : [],
    })) as OrgSearchRow[];

    rows = rows.filter((org) => {
      if (!hasQueryMatch(org, q)) return false;
      if (service && !org.service_types.some((s) => s.toLowerCase() === service)) return false;
      if (language && !org.languages.some((l) => l.toLowerCase() === language)) return false;
      if (state && !stateInCoverage(org.coverage_area, state).inArea) return false;
      if (availability === "accepting" && !org.accepting_clients) return false;
      if (availability === "open" && org.capacity_status !== "open") return false;
      if (availability === "limited" && org.capacity_status !== "limited") return false;
      if (availability === "waitlist" && org.capacity_status !== "waitlist") return false;
      if (stage !== "all" && org.profile_stage !== stage) return false;
      if (special && !org.special_populations.some((s) => s.toLowerCase() === special)) return false;
      if (accessibility && !org.accessibility_features.some((s) => s.toLowerCase() === accessibility)) {
        return false;
      }
      return true;
    });

    const designationMap = await getCurrentDesignationsForOrgIds(rows.map((r) => r.id));
    const results = rows.map((org) => {
      const d = designationMap.get(org.id);
      return {
        ...org,
        designation_tier: d?.designation_tier ?? null,
        designation_confidence: d?.designation_confidence ?? null,
        designation_summary: d?.public_summary ?? null,
      };
    });

    return apiOk({
      results,
      filters: { q, service, state, language, availability, stage, special, accessibility, includeUnready },
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("advocate.org_search.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

