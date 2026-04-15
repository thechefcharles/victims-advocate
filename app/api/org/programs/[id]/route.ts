/**
 * PATCH /api/org/programs/[id] — update a Program (org_owner / program_manager).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  updateProgram,
  type UpdateProgramInput,
} from "@/lib/server/orgPrograms/orgProgramService";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;
    if (!id) return apiFail("VALIDATION_ERROR", "Missing program id.");
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const changes: UpdateProgramInput = {};
    if (typeof body.programName === "string") changes.programName = body.programName;
    if (typeof body.programType === "string")
      changes.programType = body.programType as UpdateProgramInput["programType"];
    if ("description" in body) changes.description = (body.description as string | null) ?? null;
    if (Array.isArray(body.serviceTypes)) changes.serviceTypes = body.serviceTypes as string[];
    if (Array.isArray(body.crimeTypesServed))
      changes.crimeTypesServed = body.crimeTypesServed as string[];
    if ("eligibilityCriteria" in body)
      changes.eligibilityCriteria = (body.eligibilityCriteria as string | null) ?? null;
    if (Array.isArray(body.languages)) changes.languages = body.languages as string[];
    if ("minAge" in body) changes.minAge = (body.minAge as number | null) ?? null;
    if ("maxAge" in body) changes.maxAge = (body.maxAge as number | null) ?? null;
    if (typeof body.servesMinors === "boolean") changes.servesMinors = body.servesMinors;
    if (Array.isArray(body.geographicCoverage))
      changes.geographicCoverage = body.geographicCoverage as string[];
    if (typeof body.isActive === "boolean") changes.isActive = body.isActive;

    const updated = await updateProgram(ctx, id, changes);
    return apiOk(updated);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.programs.update.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
