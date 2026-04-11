/**
 * Domain 1.1 — SupportRequest: service layer.
 *
 * All business logic for the SupportRequest domain lives here.
 * Every mutating function follows the pipeline:
 *   1. Fetch current record
 *   2. Call can() → deny if not allowed
 *   3. (For state changes) call transition() → throw if STATE_INVALID
 *   4. Call repository update with expectedFromStatus (optimistic concurrency)
 *   5. Return serialized result appropriate to caller's account type
 *
 * Rule 16 — Transition Law: no .update({ status }) without transition() success.
 * Rule 17 — Policy Law: all auth through can(), no inline role checks.
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
import {
  getSupportRequestById,
  listSupportRequestsByApplicant,
  listSupportRequestsByOrganization,
  findActiveSupportRequestForApplicant,
  insertSupportRequestRecord,
  updateSupportRequestRecord,
} from "./supportRequestRepository";
import {
  serializeForApplicant,
  serializeForProvider,
  serializeForAdmin,
} from "./supportRequestSerializer";
import type {
  CreateSupportRequestInput,
  UpdateSupportRequestInput,
  DeclineSupportRequestInput,
  TransferSupportRequestInput,
  SupportRequestApplicantView,
  SupportRequestProviderView,
  SupportRequestAdminView,
  SupportRequestRecord,
} from "./supportRequestTypes";
import type { SupportRequestStatus } from "@/lib/registry";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Builds a PolicyResource from a SupportRequestRecord for the policy engine. */
function toResource(record: SupportRequestRecord): PolicyResource {
  return {
    type: "support_request",
    id: record.id,
    ownerId: record.applicant_id,
    tenantId: record.organization_id,
    status: record.status,
  };
}

/**
 * Returns the serialized view appropriate for the actor's account type.
 * Applicants get the applicant-safe view; providers get internal view; admins get full view.
 */
function serializeForActor(
  record: SupportRequestRecord,
  ctx: AuthContext,
): SupportRequestApplicantView | SupportRequestProviderView | SupportRequestAdminView {
  if (ctx.isAdmin) return serializeForAdmin(record);
  if (ctx.accountType === "provider") return serializeForProvider(record);
  return serializeForApplicant(record);
}

/** Throws a standardized FORBIDDEN AppError when policy denies an action. */
function denyForbidden(reason?: string): never {
  throw new AppError("FORBIDDEN", reason ?? "Access denied.");
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Creates a new support request for the authenticated applicant.
 * Enforces the one-active-request rule before insert.
 */
export async function createSupportRequest(
  ctx: AuthContext,
  input: CreateSupportRequestInput,
  supabase: SupabaseClient,
): Promise<SupportRequestApplicantView> {
  const actor = buildActor(ctx);

  // One-active-request check (service layer guard; DB partial index is backstop).
  const existing = await findActiveSupportRequestForApplicant(supabase, ctx.userId);
  if (existing) {
    throw new AppError(
      "FORBIDDEN",
      "You already have an active support request. Only one active request is allowed at a time.",
      { reason: "applicant_has_active_request", existing_id: existing.id },
    );
  }

  // Policy check — resource has no id/tenant yet; provide what we have.
  const resource: PolicyResource = {
    type: "support_request",
    id: null,
    ownerId: ctx.userId,
    tenantId: input.organization_id,
  };
  const decision = await can("support_request:create", actor, resource);
  if (!decision.allowed) denyForbidden(decision.message);

  const record = await insertSupportRequestRecord(supabase, {
    applicant_id: ctx.userId,
    organization_id: input.organization_id,
    program_id: input.program_id ?? null,
  });

  return serializeForApplicant(record);
}

// ---------------------------------------------------------------------------
// Update (draft fields only)
// ---------------------------------------------------------------------------

/**
 * Updates mutable fields on a draft support request.
 * Status changes are not allowed via this method — use the action methods.
 */
export async function updateSupportRequest(
  ctx: AuthContext,
  requestId: string,
  patch: UpdateSupportRequestInput,
  supabase: SupabaseClient,
): Promise<SupportRequestApplicantView> {
  const record = await getSupportRequestById(supabase, requestId);
  if (!record) throw new AppError("NOT_FOUND", "Support request not found.");

  if (record.status !== "draft") {
    throw new AppError("FORBIDDEN", "Only draft requests can be updated.", {
      reason: "request_not_in_draft_state",
    });
  }

  const actor = buildActor(ctx);
  const decision = await can("support_request:update_self", actor, toResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const updated = await updateSupportRequestRecord(supabase, requestId, patch, "draft");
  if (!updated) throw new AppError("FORBIDDEN", "Request was modified by another action.");

  return serializeForApplicant(updated);
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

/**
 * Transitions a draft support request to submitted.
 */
export async function submitSupportRequest(
  ctx: AuthContext,
  requestId: string,
  supabase: SupabaseClient,
): Promise<SupportRequestApplicantView> {
  const record = await getSupportRequestById(supabase, requestId);
  if (!record) throw new AppError("NOT_FOUND", "Support request not found.");

  const actor = buildActor(ctx);
  const decision = await can("support_request:submit", actor, toResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const result = await transition(
    {
      entityType: "support_request",
      entityId: requestId,
      fromState: record.status,
      toState: "submitted",
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      tenantId: record.organization_id,
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError("FORBIDDEN", `Transition failed: ${result.reason}`, {
      reason: result.reason,
    });
  }

  const updated = await updateSupportRequestRecord(
    supabase,
    requestId,
    { status: "submitted", submitted_at: new Date().toISOString() },
    record.status,
  );
  if (!updated) throw new AppError("FORBIDDEN", "Request was modified by another action.");

  return serializeForApplicant(updated);
}

// ---------------------------------------------------------------------------
// Accept
// ---------------------------------------------------------------------------

/**
 * Transitions a pending_review support request to accepted.
 */
export async function acceptSupportRequest(
  ctx: AuthContext,
  requestId: string,
  supabase: SupabaseClient,
): Promise<SupportRequestProviderView> {
  const record = await getSupportRequestById(supabase, requestId);
  if (!record) throw new AppError("NOT_FOUND", "Support request not found.");

  const actor = buildActor(ctx);
  const decision = await can("support_request:accept", actor, toResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const result = await transition(
    {
      entityType: "support_request",
      entityId: requestId,
      fromState: record.status,
      toState: "accepted",
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      tenantId: record.organization_id,
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError("FORBIDDEN", `Transition failed: ${result.reason}`, {
      reason: result.reason,
    });
  }

  const now = new Date().toISOString();
  const updated = await updateSupportRequestRecord(
    supabase,
    requestId,
    { status: "accepted", accepted_at: now, reviewed_at: now },
    record.status,
  );
  if (!updated) throw new AppError("FORBIDDEN", "Request was modified by another action.");

  return serializeForProvider(updated);
}

// ---------------------------------------------------------------------------
// Decline
// ---------------------------------------------------------------------------

/**
 * Transitions a pending_review support request to declined.
 * Requires decline_reason.
 */
export async function declineSupportRequest(
  ctx: AuthContext,
  requestId: string,
  input: DeclineSupportRequestInput,
  supabase: SupabaseClient,
): Promise<SupportRequestProviderView> {
  if (!input.decline_reason?.trim()) {
    throw new AppError("VALIDATION_ERROR", "decline_reason is required.");
  }

  const record = await getSupportRequestById(supabase, requestId);
  if (!record) throw new AppError("NOT_FOUND", "Support request not found.");

  const actor = buildActor(ctx);
  const decision = await can("support_request:decline", actor, toResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const result = await transition(
    {
      entityType: "support_request",
      entityId: requestId,
      fromState: record.status,
      toState: "declined",
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      tenantId: record.organization_id,
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError("FORBIDDEN", `Transition failed: ${result.reason}`, {
      reason: result.reason,
    });
  }

  const now = new Date().toISOString();
  const updated = await updateSupportRequestRecord(
    supabase,
    requestId,
    {
      status: "declined",
      declined_at: now,
      reviewed_at: now,
      decline_reason: input.decline_reason.trim(),
    },
    record.status,
  );
  if (!updated) throw new AppError("FORBIDDEN", "Request was modified by another action.");

  return serializeForProvider(updated);
}

// ---------------------------------------------------------------------------
// Transfer
// ---------------------------------------------------------------------------

/**
 * Transitions a pending_review support request to transferred.
 * Updates organization_id to the target organization and records transfer_reason.
 */
export async function transferSupportRequest(
  ctx: AuthContext,
  requestId: string,
  input: TransferSupportRequestInput,
  supabase: SupabaseClient,
): Promise<SupportRequestProviderView> {
  if (!input.transfer_reason?.trim()) {
    throw new AppError("VALIDATION_ERROR", "transfer_reason is required.");
  }

  const record = await getSupportRequestById(supabase, requestId);
  if (!record) throw new AppError("NOT_FOUND", "Support request not found.");

  const actor = buildActor(ctx);
  const decision = await can("support_request:transfer", actor, toResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const result = await transition(
    {
      entityType: "support_request",
      entityId: requestId,
      fromState: record.status,
      toState: "transferred",
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      tenantId: record.organization_id,
      metadata: { target_organization_id: input.target_organization_id },
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError("FORBIDDEN", `Transition failed: ${result.reason}`, {
      reason: result.reason,
    });
  }

  const now = new Date().toISOString();
  const updated = await updateSupportRequestRecord(
    supabase,
    requestId,
    {
      status: "transferred",
      organization_id: input.target_organization_id,
      transfer_reason: input.transfer_reason.trim(),
      reviewed_at: now,
    },
    record.status,
  );
  if (!updated) throw new AppError("FORBIDDEN", "Request was modified by another action.");

  return serializeForProvider(updated);
}

// ---------------------------------------------------------------------------
// Withdraw
// ---------------------------------------------------------------------------

/**
 * Transitions a draft or submitted support request to withdrawn.
 * Service-layer pre-check enforces that only draft/submitted can be withdrawn.
 */
export async function withdrawSupportRequest(
  ctx: AuthContext,
  requestId: string,
  supabase: SupabaseClient,
): Promise<SupportRequestApplicantView> {
  const record = await getSupportRequestById(supabase, requestId);
  if (!record) throw new AppError("NOT_FOUND", "Support request not found.");

  // Service-layer state pre-check (cleaner error than STATE_INVALID from engine).
  const withdrawableStatuses: SupportRequestStatus[] = ["draft", "submitted"];
  if (!withdrawableStatuses.includes(record.status)) {
    throw new AppError(
      "FORBIDDEN",
      "This request cannot be withdrawn in its current state.",
      { reason: "request_not_withdrawable_in_current_state", current_status: record.status },
    );
  }

  const actor = buildActor(ctx);
  const decision = await can("support_request:withdraw", actor, toResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const result = await transition(
    {
      entityType: "support_request",
      entityId: requestId,
      fromState: record.status,
      toState: "withdrawn",
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      tenantId: record.organization_id,
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError("FORBIDDEN", `Transition failed: ${result.reason}`, {
      reason: result.reason,
    });
  }

  const updated = await updateSupportRequestRecord(
    supabase,
    requestId,
    { status: "withdrawn", withdrawn_at: new Date().toISOString() },
    record.status,
  );
  if (!updated) throw new AppError("FORBIDDEN", "Request was modified by another action.");

  return serializeForApplicant(updated);
}

// ---------------------------------------------------------------------------
// Close
// ---------------------------------------------------------------------------

/**
 * Transitions an accepted, declined, transferred, or withdrawn request to closed.
 */
export async function closeSupportRequest(
  ctx: AuthContext,
  requestId: string,
  supabase: SupabaseClient,
): Promise<SupportRequestProviderView> {
  const record = await getSupportRequestById(supabase, requestId);
  if (!record) throw new AppError("NOT_FOUND", "Support request not found.");

  const actor = buildActor(ctx);
  const decision = await can("support_request:close", actor, toResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const result = await transition(
    {
      entityType: "support_request",
      entityId: requestId,
      fromState: record.status,
      toState: "closed",
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      tenantId: record.organization_id,
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError("FORBIDDEN", `Transition failed: ${result.reason}`, {
      reason: result.reason,
    });
  }

  const updated = await updateSupportRequestRecord(
    supabase,
    requestId,
    { status: "closed", closed_at: new Date().toISOString() },
    record.status,
  );
  if (!updated) throw new AppError("FORBIDDEN", "Request was modified by another action.");

  return serializeForProvider(updated);
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Returns a single support request, serialized for the caller's account type.
 */
export async function getSupportRequest(
  ctx: AuthContext,
  requestId: string,
  supabase: SupabaseClient,
): Promise<SupportRequestApplicantView | SupportRequestProviderView | SupportRequestAdminView> {
  const record = await getSupportRequestById(supabase, requestId);
  if (!record) throw new AppError("NOT_FOUND", "Support request not found.");

  const actor = buildActor(ctx);
  const decision = await can("support_request:view", actor, toResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  return serializeForActor(record, ctx);
}

/**
 * Returns the list of support requests for the authenticated actor.
 * Applicants see their own requests; providers see org-scoped requests.
 */
export async function listSupportRequests(
  ctx: AuthContext,
  filters: { status?: SupportRequestStatus },
  supabase: SupabaseClient,
): Promise<
  Array<SupportRequestApplicantView | SupportRequestProviderView | SupportRequestAdminView>
> {
  if (ctx.accountType === "applicant") {
    const records = await listSupportRequestsByApplicant(supabase, ctx.userId, filters);
    return records.map((r) => serializeForApplicant(r));
  }

  if (ctx.accountType === "provider" && ctx.orgId) {
    const records = await listSupportRequestsByOrganization(supabase, ctx.orgId, filters);
    return records.map((r) => serializeForProvider(r));
  }

  if (ctx.isAdmin) {
    // Admin list: org-scoped if actor has orgId, else empty (full scan deferred to admin tool).
    if (ctx.orgId) {
      const records = await listSupportRequestsByOrganization(supabase, ctx.orgId, filters);
      return records.map((r) => serializeForAdmin(r));
    }
    return [];
  }

  return [];
}
