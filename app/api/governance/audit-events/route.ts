/**
 * GET /api/governance/audit-events — list audit events (admin only)
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getAuditEvents } from "@/lib/server/governance/auditService";
import { serializeAuditEvent } from "@/lib/server/governance/governanceSerializer";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const actor = buildActor(ctx);
    const decision = await can("audit_event:view", actor, { type: "audit_event", id: null });
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);

    const url = new URL(req.url);
    const events = await getAuditEvents({
      resourceType: url.searchParams.get("resource_type") ?? undefined,
      eventCategory: url.searchParams.get("event_category") ?? undefined,
      actorId: url.searchParams.get("actor_id") ?? undefined,
      limit: Math.min(Number(url.searchParams.get("limit") ?? "50"), 200),
    });
    return apiOk({ events: events.map(serializeAuditEvent) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") logger.error("governance.audit.list.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
