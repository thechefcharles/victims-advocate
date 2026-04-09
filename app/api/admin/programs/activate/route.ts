/**
 * Domain 3.3 — Admin: activate a draft program (one active version per program_key).
 * Auth via can("admin:manage_programs"). Logic delegated to programService.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { activateProgramDefinition, ProgramNotFoundError, ProgramStateError } from "@/lib/server/programs";
import { serializeProgramDefinition } from "@/lib/server/serializers/program.serializer";

const ADMIN_RESOURCE = { type: "admin" as const, id: "platform", ownerId: "" };

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("admin:manage_programs", actor, ADMIN_RESOURCE);
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Admin only.", undefined, 403);

    const body = await req.json().catch(() => null);
    const id = body?.id ?? body?.program_id;
    if (!id || typeof id !== "string") {
      return apiFail("VALIDATION_ERROR", "id is required.", undefined, 422);
    }

    const program = await activateProgramDefinition(id, ctx);

    logger.info("admin.programs.activate", { id, program_key: program.program_key, userId: ctx.userId });
    return apiOk({ program: serializeProgramDefinition(program) });
  } catch (err) {
    if (err instanceof ProgramNotFoundError) {
      return apiFail("NOT_FOUND", "Program definition not found.", undefined, 404);
    }
    if (err instanceof ProgramStateError) {
      return apiFail("VALIDATION_ERROR", err.message, undefined, 422);
    }
    const appErr = toAppError(err);
    logger.error("admin.programs.activate.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
