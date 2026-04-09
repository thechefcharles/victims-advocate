/**
 * Domain 3.3 — Admin: list and create program definitions.
 * Auth via can("admin:manage_programs"). Logic delegated to programService.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { listProgramDefinitions, createProgramDefinition } from "@/lib/server/programs";
import { serializeProgramDefinition } from "@/lib/server/serializers/program.serializer";

const SCOPE_TYPES = ["state", "federal", "local", "general"] as const;
const ADMIN_RESOURCE = { type: "admin" as const, id: "platform", ownerId: "" };

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("admin:manage_programs", actor, ADMIN_RESOURCE);
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Admin only.", undefined, 403);

    const url = new URL(req.url);
    const status = url.searchParams.get("status") as "draft" | "active" | "archived" | null;
    const stateCode = url.searchParams.get("stateCode") ?? url.searchParams.get("state_code") ?? undefined;
    const isActiveParam = url.searchParams.get("isActive");
    const is_active = isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;

    const programs = await listProgramDefinitions({ status: status ?? undefined, state_code: stateCode, is_active });
    return apiOk({ programs: programs.map(serializeProgramDefinition) });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.programs.list.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

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

    const programKey = typeof body.program_key === "string" ? body.program_key.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!programKey || !name) {
      return apiFail("VALIDATION_ERROR", "program_key and name are required.", undefined, 422);
    }

    const scopeType = body.scope_type ?? "state";
    if (!SCOPE_TYPES.includes(scopeType)) {
      return apiFail("VALIDATION_ERROR", "scope_type must be state|federal|local|general.", undefined, 422);
    }

    const program = await createProgramDefinition(
      {
        program_key: programKey,
        name,
        description: typeof body.description === "string" ? body.description.trim() || null : null,
        state_code: typeof body.state_code === "string" ? body.state_code.trim() || null : null,
        scope_type: scopeType,
        version: typeof body.version === "string" ? body.version.trim() || "1" : "1",
        rule_set: body.rule_set && typeof body.rule_set === "object" ? body.rule_set : {},
        required_documents: Array.isArray(body.required_documents) ? body.required_documents : [],
        deadline_metadata: body.deadline_metadata && typeof body.deadline_metadata === "object" ? body.deadline_metadata : {},
        dependency_rules: body.dependency_rules && typeof body.dependency_rules === "object" ? body.dependency_rules : {},
        stacking_rules: body.stacking_rules && typeof body.stacking_rules === "object" ? body.stacking_rules : {},
        metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
      },
      ctx
    );

    logger.info("admin.programs.create", { program_key: programKey, userId: ctx.userId });
    return apiOk({ program: serializeProgramDefinition(program) });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.programs.create.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
