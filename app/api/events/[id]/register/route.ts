import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getEvent, registerForEvent } from "@/lib/server/events/eventService";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const existing = await getEvent({ ctx, id });

    const actor = buildActor(ctx);
    const decision = await can("event:register", actor, {
      type: "event",
      id,
      tenantId: existing.organization_id,
      status: existing.status,
      // @ts-expect-error — audienceScope is an event-specific resource extension
      audienceScope: existing.audience_scope,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const registration = await registerForEvent({ ctx, eventId: id });
    return apiOk({ registration }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("events.register.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
