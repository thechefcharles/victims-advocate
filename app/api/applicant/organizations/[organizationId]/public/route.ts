/**
 * Applicant-authenticated: public-safe organization profile for the unified profile page.
 *
 * v2 (locked 2026-04-15): supports two id sources.
 *   - Internal (UUID): NxtStps-onboarded org. Returns verified=true.
 *   - External ("ext:" prefix): row from data/il-cbo-va-2026.json directory.
 *     Returns verified=false; only directory fields populated.
 *
 * Survivors should be able to see *some* version of every org listed in search.
 * Hiding profile pages behind "no NxtStps record" was a trust-breaking moment;
 * this route fixes that. The verification banner on the page tells the
 * applicant which kind of profile they're looking at.
 */

import { getAuthContext, requireAuth, requireRole } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import {
  isOrganizationMapListable,
  isExternalDirectoryId,
  getExternalOrganizationById,
} from "@/lib/server/organizations/organizationsMapData";
import { buildResponseAccessibilitySnapshot } from "@/lib/server/organizations/responseAccessibilitySnapshot";
import {
  countiesFromCoverage,
  regionLabelForOrg,
  statesFromCoverage,
} from "@/lib/server/ecosystem/regions";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    requireAuth(auth);
    requireRole(auth, "victim");

    const { organizationId: rawId } = await params;
    const organizationId = (rawId ?? "").trim();
    if (!organizationId) {
      return apiFail(
        "VALIDATION_ERROR",
        "We couldn't match that organization. Open it again from your list or dashboard.",
        undefined,
        422,
      );
    }

    // -----------------------------------------------------------------------
    // External directory path (unverified)
    // -----------------------------------------------------------------------
    if (isExternalDirectoryId(organizationId)) {
      const ext = getExternalOrganizationById(organizationId);
      if (!ext) {
        return apiFail("NOT_FOUND", "Organization not found", undefined, 404);
      }
      return apiOk({
        organization: {
          id: ext.id,
          name: ext.name,
          verified: false,
          source: "directory" as const,
          // Fields we have for external orgs:
          address: ext.address ?? null,
          phone: ext.phone ?? null,
          website: ext.website ?? null,
          program_type: ext.program_type ?? null,
          region_label: ext.region_label,
          // Fields we do NOT have for external orgs (UI hides their sections):
          service_types: [],
          special_populations: [],
          accepting_clients: false,
          capacity_status: "unknown",
          response_accessibility: null,
        },
      });
    }

    // -----------------------------------------------------------------------
    // Internal NxtStps org path (verified)
    // -----------------------------------------------------------------------
    if (!UUID_RE.test(organizationId)) {
      return apiFail(
        "VALIDATION_ERROR",
        "We couldn't match that organization. Open it again from your list or dashboard.",
        undefined,
        422,
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: org, error } = await supabase
      .from("organizations")
      .select(
        "id,name,service_types,special_populations,languages,intake_methods,hours,accepting_clients,capacity_status,avg_response_time_hours,accessibility_features,coverage_area,metadata,status,lifecycle_status,public_profile_status,profile_status,profile_stage"
      )
      .eq("id", organizationId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!org || !isOrganizationMapListable(org)) {
      return apiFail("NOT_FOUND", "Organization not found", undefined, 404);
    }

    const stage = String(org.profile_stage ?? "").trim();
    if (!["created", "searchable", "enriched"].includes(stage)) {
      return apiFail("NOT_FOUND", "Organization not found", undefined, 404);
    }

    const cov = org.coverage_area as Record<string, unknown>;
    const states = statesFromCoverage(cov);
    const counties = countiesFromCoverage(cov);

    const meta = org.metadata as Record<string, unknown> | null | undefined;
    const listingAddress =
      typeof meta?.listing_address === "string" && meta.listing_address.trim()
        ? meta.listing_address.trim()
        : null;
    const listingPhone =
      typeof meta?.listing_phone === "string" && meta.listing_phone.trim()
        ? meta.listing_phone.trim()
        : null;
    const listingWebsite =
      typeof meta?.listing_website === "string" && meta.listing_website.trim()
        ? meta.listing_website.trim()
        : null;

    return apiOk({
      organization: {
        id: org.id,
        name: org.name,
        verified: true,
        source: "nxtstps" as const,
        service_types: Array.isArray(org.service_types) ? org.service_types : [],
        special_populations: Array.isArray(org.special_populations)
          ? org.special_populations.filter((x): x is string => typeof x === "string")
          : [],
        accepting_clients: Boolean(org.accepting_clients),
        capacity_status: org.capacity_status ?? "unknown",
        region_label: regionLabelForOrg(states, counties),
        address: listingAddress,
        phone: listingPhone,
        website: listingWebsite,
        program_type: null,
        response_accessibility: buildResponseAccessibilitySnapshot({
          languages: org.languages,
          intake_methods: org.intake_methods,
          hours: org.hours,
          avg_response_time_hours: org.avg_response_time_hours,
          accessibility_features: org.accessibility_features,
        }),
      },
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("victim.organizations.public.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
