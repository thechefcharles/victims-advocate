import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createEvent, listEvents } from "@/lib/server/events/eventService";
import {
  serializeForPublic,
  serializeForProvider,
  serializeForAdmin,
} from "@/lib/server/events/eventSerializer";
import { z } from "zod";

const createEventBodySchema = z.object({
  organization_id: z.string().uuid(),
  program_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).nullable().optional(),
  event_type: z.string().min(1).max(100),
  start_at: z.string().datetime({ offset: true }),
  end_at: z.string().datetime({ offset: true }),
  timezone: z.string().optional(),
  location: z.string().max(1000).nullable().optional(),
  modality: z.enum(["in_person", "virtual", "hybrid"]).optional(),
  audience_scope: z.enum(["public", "applicant_visible", "provider_internal", "invite_only"]),
  capacity: z.number().int().nonnegative().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("event:list", actor, { type: "event", id: null });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organization_id") ?? undefined;
    const programId = searchParams.get("program_id") ?? undefined;

    // Applicant: public scope (published + public/applicant_visible only)
    if (ctx.accountType === "applicant") {
      const events = await listEvents({
        ctx,
        scope: "public",
        organizationId: orgId,
        programId,
      });
      return apiOk({ events: events.map(serializeForPublic) });
    }

    // Provider: org-scoped full view
    const providerOrgId = ctx.isAdmin ? (orgId ?? ctx.orgId) : ctx.orgId;
    if (!providerOrgId) {
      return apiFail("VALIDATION_ERROR", "organization_id required for provider scope.", undefined, 422);
    }

    const events = await listEvents({
      ctx,
      scope: "provider",
      organizationId: providerOrgId,
      programId,
    });

    const serialized = ctx.isAdmin
      ? events.map(serializeForAdmin)
      : events.map(serializeForProvider);

    return apiOk({ events: serialized });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("events.list.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json();
    const parsed = createEventBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiFail("VALIDATION_ERROR", "Invalid event input.", parsed.error.flatten(), 422);
    }

    const actor = buildActor(ctx);
    const decision = await can("event:create", actor, {
      type: "event",
      id: null,
      tenantId: parsed.data.organization_id,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const event = await createEvent({ ctx, input: parsed.data });
    return apiOk({ event: serializeForProvider(event) }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("events.create.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
