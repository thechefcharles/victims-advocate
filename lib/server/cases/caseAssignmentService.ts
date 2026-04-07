/**
 * Domain 1.2 — Case: assignment and reassignment service.
 *
 * Separated from caseService.ts to keep the assignment logic cohesive.
 * Both assign (open→assigned) and reassign (in-progress, field swap only)
 * go through policy + transition where applicable.
 *
 * Rule 16 — Transition Law: all status changes through transition().
 * Rule 17 — Policy Law: all auth through can().
 *
 * Data class: Class A — Restricted.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { transition } from "@/lib/server/workflow/engine";
import type { AuthContext } from "@/lib/server/auth/context";
import type { PolicyResource } from "@/lib/server/policy/policyTypes";
import { getCaseRecordById, updateCaseRecord, updateCaseFields } from "./caseRepository";
import { serializeCaseForProvider } from "./caseSerializer";
import type { CaseProviderView, CaseRecord } from "./caseTypes";

/** Builds a PolicyResource from a CaseRecord. */
function toResource(record: CaseRecord): PolicyResource {
  return {
    type: "case",
    id: record.id,
    ownerId: record.owner_user_id,
    tenantId: record.organization_id ?? undefined,
    assignedTo: record.assigned_advocate_id ?? undefined,
    status: record.status,
  };
}

/**
 * Assigns a case for the first time (open → assigned).
 * Sets assigned_advocate_id and transitions status to "assigned".
 */
export async function assignCase(
  ctx: AuthContext,
  caseId: string,
  advocateId: string,
  supabase: SupabaseClient,
): Promise<CaseProviderView> {
  const record = await getCaseRecordById(supabase, caseId);
  if (!record) throw new AppError("NOT_FOUND", "Case not found.");

  const actor = buildActor(ctx);
  const decision = await can("case:assign", actor, toResource(record));
  if (!decision.allowed) throw new AppError("FORBIDDEN", decision.message ?? "Access denied.");

  const result = await transition(
    {
      entityType: "case_status",
      entityId: caseId,
      fromState: record.status,
      toState: "assigned",
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      tenantId: record.organization_id ?? undefined,
      metadata: { advocate_id: advocateId },
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError("FORBIDDEN", `Transition failed: ${result.reason}`, {
      reason: result.reason,
    });
  }

  const updated = await updateCaseRecord(
    supabase,
    caseId,
    { status: "assigned", assigned_advocate_id: advocateId },
    record.status,
  );
  if (!updated) throw new AppError("FORBIDDEN", "Case was modified by another action.");

  return serializeCaseForProvider(updated);
}

/**
 * Reassigns a case to a different advocate (no status transition — advocate swap only).
 * Allowed from any non-terminal status where assignment makes sense.
 */
export async function reassignCase(
  ctx: AuthContext,
  caseId: string,
  advocateId: string,
  supabase: SupabaseClient,
): Promise<CaseProviderView> {
  const record = await getCaseRecordById(supabase, caseId);
  if (!record) throw new AppError("NOT_FOUND", "Case not found.");

  const actor = buildActor(ctx);
  const decision = await can("case:reassign", actor, toResource(record));
  if (!decision.allowed) throw new AppError("FORBIDDEN", decision.message ?? "Access denied.");

  const updated = await updateCaseFields(supabase, caseId, {
    assigned_advocate_id: advocateId,
  });
  if (!updated) throw new AppError("INTERNAL", "Failed to reassign case.");

  return serializeCaseForProvider(updated);
}
