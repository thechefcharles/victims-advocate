import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getEvent, publishEvent } from "@/lib/server/events/eventService";
import { serializeForProvider } from "@/lib/server/events/eventSerializer";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const existing = await getEvent({ ctx, id });

    const actor = buildActor(ctx);
    const decision = await can("event:publish", actor, {
      type: "event",
      id,
      tenantId: existing.organization_id,
      status: existing.status,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const published = await publishEvent({ ctx, id });
    return apiOk({ event: serializeForProvider(published) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("events.publish.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
