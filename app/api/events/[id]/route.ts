import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getEvent, updateEvent } from "@/lib/server/events/eventService";
import {
  serializeForPublic,
  serializeForProvider,
  serializeForAdmin,
} from "@/lib/server/events/eventSerializer";
import { z } from "zod";

interface RouteParams { params: Promise<{ id: string }> }

const updateEventBodySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullable().optional(),
  event_type: z.string().min(1).max(100).optional(),
  start_at: z.string().datetime({ offset: true }).optional(),
  end_at: z.string().datetime({ offset: true }).optional(),
  timezone: z.string().optional(),
  location: z.string().max(1000).nullable().optional(),
  modality: z.enum(["in_person", "virtual", "hybrid"]).optional(),
  audience_scope: z.enum(["public", "applicant_visible", "provider_internal", "invite_only"]).optional(),
  capacity: z.number().int().nonnegative().nullable().optional(),
  registration_open: z.boolean().optional(),
});

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const event = await getEvent({ ctx, id });

    const actor = buildActor(ctx);
    const decision = await can("event:view", actor, {
      type: "event",
      id,
      tenantId: event.organization_id,
      status: event.status,
      // audienceScope extension consumed by evalEvent
      // @ts-expect-error — audienceScope is an event-specific resource extension
      audienceScope: event.audience_scope,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    if (ctx.accountType === "applicant") {
      return apiOk({ event: serializeForPublic(event) });
    }
    if (ctx.isAdmin) {
      return apiOk({ event: serializeForAdmin(event) });
    }
    return apiOk({ event: serializeForProvider(event) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("events.get.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}

export async function PATCH(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const existing = await getEvent({ ctx, id });

    const actor = buildActor(ctx);
    const decision = await can("event:update", actor, {
      type: "event",
      id,
      tenantId: existing.organization_id,
      status: existing.status,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const body = await req.json();
    const parsed = updateEventBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiFail("VALIDATION_ERROR", "Invalid event update.", parsed.error.flatten(), 422);
    }

    const updated = await updateEvent({ ctx, id, fields: parsed.data });
    return apiOk({ event: serializeForProvider(updated) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("events.update.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
