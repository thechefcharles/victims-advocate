/**
 * POST /api/ai-guidance/sessions/[id]/messages — send a message (triggers AI response)
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { sendAIGuidanceMessage } from "@/lib/server/aiGuidance/aiGuidanceService";
import { serializeEscalation } from "@/lib/server/aiGuidance/aiGuidanceSerializer";
import { z } from "zod";

interface RouteParams { params: Promise<{ id: string }> }

const body = z.object({ content: z.string().min(1).max(5000) });

export async function POST(req: Request, ctxParams: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await ctxParams.params;
    const actor = buildActor(ctx);

    const decision = await can("ai_guidance.message.send", actor, {
      type: "ai_guidance", id, ownerId: ctx.userId,
    });
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);

    const parsed = body.safeParse(await req.json());
    if (!parsed.success) return apiFail("VALIDATION_ERROR", "Message content required.", parsed.error.flatten(), 422);

    const result = await sendAIGuidanceMessage({
      actor, sessionId: id, content: parsed.data.content,
    });

    if (result.escalation) {
      return apiOk({ escalation: serializeEscalation(result.escalation), message: null });
    }
    return apiOk({
      message: {
        id: result.message.id,
        actorType: result.message.actorType,
        content: result.message.content,
        contentType: result.message.contentType,
        disclaimerFlags: result.message.disclaimerFlags,
        createdAt: result.message.createdAt,
      },
    });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") logger.error("ai-guidance.messages.send.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
