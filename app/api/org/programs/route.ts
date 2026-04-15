/**
 * POST /api/org/programs — create a Program for the caller's org.
 *   Auth: org_owner / program_manager (or platform admin).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  createProgram,
  type CreateProgramInput,
  type ProgramType,
} from "@/lib/server/orgPrograms/orgProgramService";

export const runtime = "nodejs";

const PROGRAM_TYPES: ProgramType[] = [
  "direct_services",
  "legal_advocacy",
  "counseling",
  "emergency_shelter",
  "transitional_housing",
  "financial_assistance",
  "court_advocacy",
  "hospital_advocacy",
  "crisis_hotline",
  "other",
];

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown> & {
      organizationId?: string;
    };
    const orgId = typeof body.organizationId === "string" ? body.organizationId : ctx.orgId;
    if (!orgId) {
      return apiFail("VALIDATION_ERROR", "organizationId required.");
    }
    if (!PROGRAM_TYPES.includes(body.programType as ProgramType)) {
      return apiFail("VALIDATION_ERROR", "Invalid programType.");
    }
    const input: CreateProgramInput = {
      programName: String(body.programName ?? ""),
      programType: body.programType as ProgramType,
      description: (body.description as string | null) ?? null,
      serviceTypes: Array.isArray(body.serviceTypes) ? (body.serviceTypes as string[]) : undefined,
      crimeTypesServed: Array.isArray(body.crimeTypesServed)
        ? (body.crimeTypesServed as string[])
        : undefined,
      eligibilityCriteria: (body.eligibilityCriteria as string | null) ?? null,
      languages: Array.isArray(body.languages) ? (body.languages as string[]) : undefined,
      acceptingReferrals:
        typeof body.acceptingReferrals === "boolean" ? body.acceptingReferrals : undefined,
      capacityStatus: body.capacityStatus as CreateProgramInput["capacityStatus"],
      minAge: typeof body.minAge === "number" ? body.minAge : null,
      maxAge: typeof body.maxAge === "number" ? body.maxAge : null,
      servesMinors: typeof body.servesMinors === "boolean" ? body.servesMinors : false,
      geographicCoverage: Array.isArray(body.geographicCoverage)
        ? (body.geographicCoverage as string[])
        : undefined,
    };
    const created = await createProgram(ctx, orgId, input);
    return apiOk(created);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.programs.create.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
