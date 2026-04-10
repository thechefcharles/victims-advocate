/**
 * Domain 3.3 — Admin: update a draft program definition.
 * Auth via can("admin:manage_programs"). Logic delegated to programService.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { updateProgramDefinition, ProgramNotFoundError, ProgramStateError } from "@/lib/server/programs";
import { serializeProgramDefinition } from "@/lib/server/serializers/program.serializer";

const SCOPE_TYPES = ["state", "federal", "local", "general"] as const;
const ADMIN_RESOURCE = { type: "admin" as const, id: "platform", ownerId: "" };

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("admin:manage_programs", actor, ADMIN_RESOURCE);
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Admin only.", undefined, 403);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
    }

    const id = body.id ?? body.program_id;
    if (!id || typeof id !== "string") {
      return apiFail("VALIDATION_ERROR", "id is required.", undefined, 422);
    }

    const payload: Record<string, unknown> = {};
    if (typeof body.name === "string") payload.name = body.name.trim();
    if (body.description !== undefined) payload.description = body.description;
    if (body.state_code !== undefined) payload.state_code = body.state_code;
    if (typeof body.program_key === "string") payload.program_key = body.program_key.trim();
    if (body.scope_type && SCOPE_TYPES.includes(body.scope_type)) payload.scope_type = body.scope_type;
    if (typeof body.version === "string") payload.version = body.version.trim();
    if (body.rule_set && typeof body.rule_set === "object") payload.rule_set = body.rule_set;
    if (Array.isArray(body.required_documents)) payload.required_documents = body.required_documents;
    if (body.deadline_metadata && typeof body.deadline_metadata === "object") payload.deadline_metadata = body.deadline_metadata;
    if (body.dependency_rules && typeof body.dependency_rules === "object") payload.dependency_rules = body.dependency_rules;
    if (body.stacking_rules && typeof body.stacking_rules === "object") payload.stacking_rules = body.stacking_rules;
    if (body.metadata && typeof body.metadata === "object") payload.metadata = body.metadata;

    const program = await updateProgramDefinition(id, payload, ctx);

    logger.info("admin.programs.update", { id, userId: ctx.userId });
    return apiOk({ program: serializeProgramDefinition(program) });
  } catch (err) {
    if (err instanceof ProgramNotFoundError) {
      return apiFail("NOT_FOUND", "Program definition not found.", undefined, 404);
    }
    if (err instanceof ProgramStateError) {
      return apiFail("VALIDATION_ERROR", err.message, undefined, 422);
    }
    const appErr = toAppError(err);
    logger.error("admin.programs.update.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
