/**
 * GET /api/providers/[id]/programs — PUBLIC list of an org's active programs.
 */

import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getProgramsForOrg } from "@/lib/server/orgPrograms/orgProgramService";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    if (!id) return apiFail("VALIDATION_ERROR", "Missing provider id.");
    const programs = await getProgramsForOrg(id, { activeOnly: true });
    return apiOk({
      programs: programs.map((p) => ({
        id: p.id,
        programName: p.program_name,
        programType: p.program_type,
        description: p.description,
        serviceTypes: p.service_types,
        crimeTypesServed: p.crime_types_served,
        languages: p.languages,
        acceptingReferrals: p.accepting_referrals,
        capacityStatus: p.capacity_status,
        servesMinors: p.serves_minors,
        geographicCoverage: p.geographic_coverage,
      })),
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("providers.programs.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
