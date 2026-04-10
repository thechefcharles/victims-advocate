import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getEvent, cancelEvent } from "@/lib/server/events/eventService";
import { serializeForProvider } from "@/lib/server/events/eventSerializer";
import { z } from "zod";

interface RouteParams { params: Promise<{ id: string }> }

const cancelBodySchema = z.object({
  reason: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const existing = await getEvent({ ctx, id });

    const actor = buildActor(ctx);
    const decision = await can("event:cancel", actor, {
      type: "event",
      id,
      tenantId: existing.organization_id,
      status: existing.status,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = cancelBodySchema.safeParse(body);
    const reason = parsed.success ? parsed.data.reason : null;

    const cancelled = await cancelEvent({ ctx, id, reason });
    return apiOk({ event: serializeForProvider(cancelled) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("events.cancel.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
