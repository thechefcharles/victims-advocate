/**
 * Domain 7.1 — Audit service.
 *
 * **logAuditEvent()** is the GLOBAL audit function. Every domain that
 * performs a critical mutation should import and call it. It writes to
 * the append-only `audit_events` table (DB triggers block UPDATE/DELETE).
 *
 * This is SEPARATE from the legacy `logEvent()` in `lib/server/audit/logEvent.ts`
 * which writes to the `audit_log` table. Both coexist during migration — new
 * governance-grade audit calls go through `logAuditEvent`; legacy calls
 * continue through `logEvent` until they are migrated.
 *
 * Fire-and-forget pattern: callers should `void logAuditEvent(...)` or
 * `.catch(() => {})` — audit failures must not break the caller's workflow.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuditEvent, LogAuditEventInput } from "./governanceTypes";
import { insertAuditEvent, listAuditEvents } from "./governanceRepository";

/**
 * Writes an immutable audit event to the governance audit_events table.
 *
 * **GLOBAL EXPORT** — import from `@/lib/server/governance/auditService`.
 *
 * Never throws — wraps in try/catch so callers can fire-and-forget.
 */
export async function logAuditEvent(
  event: LogAuditEventInput,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<AuditEvent | null> {
  try {
    return await insertAuditEvent(
      {
        actorId: event.actorId,
        tenantId: event.tenantId ?? null,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        eventCategory: event.eventCategory,
        metadata: event.metadata ?? {},
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
      },
      supabase,
    );
  } catch {
    // Non-fatal — audit failures must not break the caller's workflow.
    return null;
  }
}

/**
 * List audit events with optional filters. Admin only.
 */
export async function getAuditEvents(
  filters: {
    resourceType?: string;
    resourceId?: string;
    eventCategory?: string;
    actorId?: string;
    limit?: number;
  },
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<AuditEvent[]> {
  return listAuditEvents(filters, supabase);
}

/**
 * Export audit events for compliance reporting. Returns the same data
 * as getAuditEvents but intended for bulk export flows.
 */
export async function exportAuditEvents(
  filters: {
    resourceType?: string;
    eventCategory?: string;
    limit?: number;
  },
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<AuditEvent[]> {
  return listAuditEvents({ ...filters, limit: filters.limit ?? 1000 }, supabase);
}
