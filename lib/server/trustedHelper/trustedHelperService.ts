/**
 * Domain 5.1 — Trusted helper service layer.
 *
 * Orchestrates state machine + repository + audit events.
 *
 * THE SINGLE MOST IMPORTANT FUNCTION: resolveTrustedHelperScope()
 * ---------------------------------------------------------------
 * This is the single gate for all runtime helper authorization. Downstream
 * services MUST NOT reinvent their own helper-access logic — they MUST call
 * this function to check whether a helper may perform an action on behalf of
 * an applicant.
 *
 * Key runtime rules:
 *   - Only status='active' grants confer permission (NOT pending/revoked/expired).
 *   - Revocation is enforced on EVERY action — not cached from login.
 *   - expires_at is checked on every action — expired grants deny immediately.
 *   - Requested action must be present in granted_scope_detail.allowedActions.
 *   - If resourceContext.caseId is provided and grant.caseRestriction is set,
 *     the case IDs must match.
 */

import { AppError } from "@/lib/server/api";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";
import type { AuthContext } from "@/lib/server/auth";
import type {
  TrustedHelperAccessRow,
  TrustedHelperEventRow,
  HelperAccessDecision,
  HelperGrantedScope,
  CreateTrustedHelperAccessInput,
  UpdateScopeInput,
} from "./trustedHelperTypes";
import { isEmptyHelperScope } from "./trustedHelperTypes";
import {
  getTrustedHelperAccessById,
  listTrustedHelperAccessByApplicantId,
  listTrustedHelperAccessByHelperUserId,
  findActiveGrantForPair,
  createTrustedHelperAccess as dbCreate,
  updateTrustedHelperAccessStatus,
  updateTrustedHelperAccessScope,
  createTrustedHelperEvent,
  listTrustedHelperEventsByGrantId,
} from "./trustedHelperRepository";
import { validateHelperGrantTransition } from "./trustedHelperStateMachine";

// ---------------------------------------------------------------------------
// resolveTrustedHelperScope — the central authorization resolver
// ---------------------------------------------------------------------------

/**
 * The single runtime gate for helper-acting-on-behalf-of-applicant authorization.
 *
 * @param helperActor     The PolicyActor of the helper making the request
 * @param applicantId     The applicant being acted upon
 * @param requestedAction The action string being attempted (e.g. "case:read")
 * @param resourceContext Optional context (e.g. { caseId: "case-1" })
 *
 * @returns HelperAccessDecision — { allowed, grantId, deniedReason }
 */
export async function resolveTrustedHelperScope(
  helperActor: PolicyActor,
  applicantId: string,
  requestedAction: string,
  resourceContext?: Record<string, unknown>,
): Promise<HelperAccessDecision> {
  if (!helperActor.userId) {
    return { allowed: false, grantId: null, deniedReason: "no_grant" };
  }

  // 1. Find grant for this (applicant, helper) pair — any status
  const grant = await findGrantForPair({
    applicant_user_id: applicantId,
    helper_user_id: helperActor.userId,
  });

  if (!grant) {
    return { allowed: false, grantId: null, deniedReason: "no_grant" };
  }

  // 2. Status must be active
  if (grant.status === "revoked") {
    return { allowed: false, grantId: grant.id, deniedReason: "revoked" };
  }
  if (grant.status === "expired") {
    return { allowed: false, grantId: grant.id, deniedReason: "expired" };
  }
  if (grant.status !== "active") {
    // pending or unknown — treated as no effective access
    return { allowed: false, grantId: grant.id, deniedReason: "no_grant" };
  }

  // 3. expires_at runtime check — a grant whose expires_at has passed is expired,
  //    regardless of stored status. Status will be swept to 'expired' by a job.
  if (grant.expires_at) {
    const expiresAt = new Date(grant.expires_at).getTime();
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      return { allowed: false, grantId: grant.id, deniedReason: "expired" };
    }
  }

  // 4. Scope check — allowedActions in granted_scope_detail
  const scope = grant.granted_scope_detail;
  const allowedActions = scope.allowedActions ?? [];
  if (!allowedActions.includes(requestedAction)) {
    return { allowed: false, grantId: grant.id, deniedReason: "out_of_scope" };
  }

  // 5. Case restriction check
  if (scope.caseRestriction && resourceContext) {
    const caseId = (resourceContext.caseId as string | undefined) ?? undefined;
    if (caseId && caseId !== scope.caseRestriction) {
      return { allowed: false, grantId: grant.id, deniedReason: "out_of_scope" };
    }
  }

  // 6. viewOnly gate — mutating actions blocked
  if (scope.viewOnly) {
    // Convention: any action containing ":read" / ":view" / ":list" is safe.
    const isReadAction =
      requestedAction.includes(":read") ||
      requestedAction.includes(":view") ||
      requestedAction.includes(":list");
    if (!isReadAction) {
      return { allowed: false, grantId: grant.id, deniedReason: "out_of_scope" };
    }
  }

  return { allowed: true, grantId: grant.id, deniedReason: null };
}

/**
 * Find a grant for an (applicant, helper) pair regardless of status.
 * Used by resolveTrustedHelperScope so we can distinguish no-grant from revoked/expired.
 */
async function findGrantForPair(params: {
  applicant_user_id: string;
  helper_user_id: string;
}): Promise<TrustedHelperAccessRow | null> {
  // First try the active-status fast path (hot index)
  const active = await findActiveGrantForPair(params);
  if (active) return active;

  // Fallback: look up any latest grant for the pair (to report revoked/expired correctly)
  const helperGrants = await listTrustedHelperAccessByHelperUserId(params.helper_user_id);
  const match = helperGrants.find((g) => g.applicant_user_id === params.applicant_user_id);
  return match ?? null;
}

// ---------------------------------------------------------------------------
// Create / grant
// ---------------------------------------------------------------------------

export async function createTrustedHelperAccess(params: {
  ctx: AuthContext;
  input: CreateTrustedHelperAccessInput;
}): Promise<TrustedHelperAccessRow> {
  const { ctx, input } = params;

  // Applicants can only grant on their own account
  if (input.applicant_user_id !== ctx.userId) {
    throw new AppError(
      "FORBIDDEN",
      "Applicants may only grant helper access on their own account.",
      undefined,
      403,
    );
  }

  if (input.applicant_user_id === input.helper_user_id) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Helper and applicant must be different users.",
      undefined,
      422,
    );
  }

  if (isEmptyHelperScope(input.granted_scope_detail)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "granted_scope_detail must include at least one allowedAction or allowedDomain.",
      undefined,
      422,
    );
  }

  const grant = await dbCreate({ ...input, granted_by_user_id: ctx.userId });

  await createTrustedHelperEvent({
    grant_id: grant.id,
    event_type: "granted",
    new_status: "pending",
    actor_user_id: ctx.userId,
    metadata: {
      relationship_type: input.relationship_type ?? null,
      expires_at: input.expires_at ?? null,
    },
  });

  return grant;
}

// ---------------------------------------------------------------------------
// Accept (helper-initiated — pending → active)
// ---------------------------------------------------------------------------

export async function acceptTrustedHelperAccess(params: {
  ctx: AuthContext;
  id: string;
}): Promise<TrustedHelperAccessRow> {
  const { ctx, id } = params;
  const grant = await getTrustedHelperAccessById(id);
  if (!grant) throw new AppError("NOT_FOUND", "Grant not found", undefined, 404);
  if (grant.helper_user_id !== ctx.userId) {
    throw new AppError("FORBIDDEN", "Only the named helper may accept this grant.", undefined, 403);
  }

  validateHelperGrantTransition(grant.status, "active");

  const updated = await updateTrustedHelperAccessStatus({
    id,
    status: "active",
    setAcceptedAt: true,
  });

  await createTrustedHelperEvent({
    grant_id: id,
    event_type: "accepted",
    previous_status: grant.status,
    new_status: "active",
    actor_user_id: ctx.userId,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Revoke (applicant-initiated — any non-terminal → revoked)
// ---------------------------------------------------------------------------

export async function revokeTrustedHelperAccess(params: {
  ctx: AuthContext;
  id: string;
  reason?: string | null;
}): Promise<TrustedHelperAccessRow> {
  const { ctx, id } = params;
  const grant = await getTrustedHelperAccessById(id);
  if (!grant) throw new AppError("NOT_FOUND", "Grant not found", undefined, 404);
  if (grant.applicant_user_id !== ctx.userId) {
    throw new AppError("FORBIDDEN", "Only the applicant may revoke this grant.", undefined, 403);
  }

  validateHelperGrantTransition(grant.status, "revoked");

  const updated = await updateTrustedHelperAccessStatus({
    id,
    status: "revoked",
    setRevokedAt: true,
  });

  await createTrustedHelperEvent({
    grant_id: id,
    event_type: "revoked",
    previous_status: grant.status,
    new_status: "revoked",
    actor_user_id: ctx.userId,
    metadata: params.reason ? { reason: params.reason } : {},
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Expire (system/admin sweep — active → expired)
// ---------------------------------------------------------------------------

export async function expireTrustedHelperAccess(params: {
  id: string;
  actor_user_id?: string | null;
}): Promise<TrustedHelperAccessRow> {
  const grant = await getTrustedHelperAccessById(params.id);
  if (!grant) throw new AppError("NOT_FOUND", "Grant not found", undefined, 404);

  validateHelperGrantTransition(grant.status, "expired");

  const updated = await updateTrustedHelperAccessStatus({
    id: params.id,
    status: "expired",
  });

  await createTrustedHelperEvent({
    grant_id: params.id,
    event_type: "expired",
    previous_status: grant.status,
    new_status: "expired",
    actor_user_id: params.actor_user_id ?? null,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Scope update
// ---------------------------------------------------------------------------

export async function updateTrustedHelperScope(params: {
  ctx: AuthContext;
  id: string;
  input: UpdateScopeInput;
}): Promise<TrustedHelperAccessRow> {
  const { ctx, id, input } = params;
  const grant = await getTrustedHelperAccessById(id);
  if (!grant) throw new AppError("NOT_FOUND", "Grant not found", undefined, 404);
  if (grant.applicant_user_id !== ctx.userId) {
    throw new AppError("FORBIDDEN", "Only the applicant may update helper scope.", undefined, 403);
  }
  if (grant.status !== "active") {
    throw new AppError(
      "VALIDATION_ERROR",
      `Can only update scope on an active grant (current status: '${grant.status}').`,
      undefined,
      422,
    );
  }

  if (isEmptyHelperScope(input.granted_scope_detail)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "granted_scope_detail must include at least one allowedAction or allowedDomain.",
      undefined,
      422,
    );
  }

  const updated = await updateTrustedHelperAccessScope({
    id,
    granted_scope_detail: input.granted_scope_detail,
  });

  await createTrustedHelperEvent({
    grant_id: id,
    event_type: "scope_updated",
    previous_status: grant.status,
    new_status: grant.status,
    actor_user_id: ctx.userId,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getTrustedHelperAccess(params: {
  ctx: AuthContext;
  id: string;
}): Promise<TrustedHelperAccessRow> {
  const grant = await getTrustedHelperAccessById(params.id);
  if (!grant) throw new AppError("NOT_FOUND", "Grant not found", undefined, 404);
  return grant;
}

export async function listMyTrustedHelperGrants(params: {
  ctx: AuthContext;
}): Promise<TrustedHelperAccessRow[]> {
  return listTrustedHelperAccessByApplicantId(params.ctx.userId);
}

export async function listGrantsWhereIAmTheHelper(params: {
  ctx: AuthContext;
  onlyActive?: boolean;
}): Promise<TrustedHelperAccessRow[]> {
  return listTrustedHelperAccessByHelperUserId(params.ctx.userId, {
    onlyActive: params.onlyActive,
  });
}

export async function listAuditEventsForGrant(params: {
  ctx: AuthContext;
  id: string;
}): Promise<TrustedHelperEventRow[]> {
  const grant = await getTrustedHelperAccessById(params.id);
  if (!grant) throw new AppError("NOT_FOUND", "Grant not found", undefined, 404);
  if (grant.applicant_user_id !== params.ctx.userId) {
    throw new AppError("FORBIDDEN", "Only the applicant owner may view audit events.", undefined, 403);
  }
  return listTrustedHelperEventsByGrantId(params.id);
}
