/**
 * POST /api/ai-guidance/sessions — create a new AI guidance session
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createAIGuidanceSession } from "@/lib/server/aiGuidance/aiGuidanceService";
import { serializeSessionForApplicant } from "@/lib/server/aiGuidance/aiGuidanceSerializer";
import { z } from "zod";

const createBody = z.object({
  surface_type: z.enum(["applicant_intake", "applicant_case", "applicant_general", "provider_copilot", "admin_inspection"]),
  linked_object_type: z.string().optional(),
  linked_object_id: z.string().optional(),
  language: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const actor = buildActor(ctx);

    const decision = await can("ai_guidance.session.create", actor, {
      type: "ai_guidance", id: null, ownerId: ctx.userId,
    });
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);

    const parsed = createBody.safeParse(await req.json());
    if (!parsed.success) return apiFail("VALIDATION_ERROR", "Invalid input.", parsed.error.flatten(), 422);

    const session = await createAIGuidanceSession({
      actor,
      surfaceType: parsed.data.surface_type,
      linkedObjectType: parsed.data.linked_object_type,
      linkedObjectId: parsed.data.linked_object_id,
      language: parsed.data.language,
    });
    return apiOk({ session: serializeSessionForApplicant(session, []) }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") logger.error("ai-guidance.sessions.create.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
