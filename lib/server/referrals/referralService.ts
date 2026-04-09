/**
 * Domain 4.1 — Referral service layer.
 * Orchestrates state machine, repository, and consent validation.
 */

import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import type { ReferralRow, CreateReferralInput } from "./referralTypes";
import {
  getReferralById,
  listReferralsForSourceOrg,
  listReferralsForTargetOrg,
  listReferralsForApplicantSafeView,
  createReferral as dbCreateReferral,
  updateReferralStatus,
  recordReferralEvent,
} from "./referralRepository";
import { validateReferralTransition, validateReferralConsent } from "./referralStateMachine";

export async function createReferral(params: {
  ctx: AuthContext;
  input: CreateReferralInput;
}): Promise<ReferralRow> {
  const { ctx, input } = params;

  if (input.sourceOrganizationId === input.targetOrganizationId) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Source and target organizations must be different.",
      undefined,
      422,
    );
  }

  const referral = await dbCreateReferral({
    source_organization_id: input.sourceOrganizationId,
    target_organization_id: input.targetOrganizationId,
    applicant_id: input.applicantId,
    initiated_by: ctx.userId,
    case_id: input.caseId ?? null,
    support_request_id: input.supportRequestId ?? null,
    reason: input.reason ?? null,
  });

  await recordReferralEvent({
    referral_id: referral.id,
    event_type: "initiated",
    actor_id: ctx.userId,
  });

  return referral;
}

export async function getReferral(params: { ctx: AuthContext; id: string }): Promise<ReferralRow> {
  const referral = await getReferralById(params.id);
  if (!referral) throw new AppError("NOT_FOUND", "Referral not found", undefined, 404);
  return referral;
}

export async function listReferrals(params: {
  ctx: AuthContext;
  orgId: string;
  direction: "outgoing" | "incoming";
}): Promise<ReferralRow[]> {
  if (params.direction === "outgoing") {
    return listReferralsForSourceOrg(params.orgId);
  }
  return listReferralsForTargetOrg(params.orgId);
}

export async function listReferralsForApplicant(params: {
  ctx: AuthContext;
}): Promise<ReferralRow[]> {
  return listReferralsForApplicantSafeView(params.ctx.userId);
}

/**
 * Send: draft → pending_acceptance.
 * Consent gate is enforced here before any status change.
 */
export async function sendReferral(params: { ctx: AuthContext; id: string }): Promise<ReferralRow> {
  const referral = await getReferralById(params.id);
  if (!referral) throw new AppError("NOT_FOUND", "Referral not found", undefined, 404);

  validateReferralTransition(referral.status, "pending_acceptance");
  await validateReferralConsent(params.id);

  const updated = await updateReferralStatus({ id: params.id, status: "pending_acceptance" });
  await recordReferralEvent({
    referral_id: params.id,
    event_type: "sent",
    actor_id: params.ctx.userId,
  });
  return updated;
}

export async function acceptReferral(params: {
  ctx: AuthContext;
  id: string;
}): Promise<ReferralRow> {
  const referral = await getReferralById(params.id);
  if (!referral) throw new AppError("NOT_FOUND", "Referral not found", undefined, 404);

  validateReferralTransition(referral.status, "accepted");

  const updated = await updateReferralStatus({
    id: params.id,
    status: "accepted",
    respondedBy: params.ctx.userId,
  });
  await recordReferralEvent({
    referral_id: params.id,
    event_type: "accepted",
    actor_id: params.ctx.userId,
  });
  return updated;
}

export async function rejectReferral(params: {
  ctx: AuthContext;
  id: string;
  reason?: string | null;
}): Promise<ReferralRow> {
  const referral = await getReferralById(params.id);
  if (!referral) throw new AppError("NOT_FOUND", "Referral not found", undefined, 404);

  validateReferralTransition(referral.status, "rejected");

  const updated = await updateReferralStatus({
    id: params.id,
    status: "rejected",
    respondedBy: params.ctx.userId,
  });
  await recordReferralEvent({
    referral_id: params.id,
    event_type: "rejected",
    actor_id: params.ctx.userId,
    metadata: params.reason ? { reason: params.reason } : {},
  });
  return updated;
}

export async function cancelReferral(params: {
  ctx: AuthContext;
  id: string;
}): Promise<ReferralRow> {
  const referral = await getReferralById(params.id);
  if (!referral) throw new AppError("NOT_FOUND", "Referral not found", undefined, 404);

  validateReferralTransition(referral.status, "cancelled");

  const updated = await updateReferralStatus({ id: params.id, status: "cancelled" });
  await recordReferralEvent({
    referral_id: params.id,
    event_type: "cancelled",
    actor_id: params.ctx.userId,
  });
  return updated;
}

export async function closeReferral(params: {
  ctx: AuthContext;
  id: string;
}): Promise<ReferralRow> {
  const referral = await getReferralById(params.id);
  if (!referral) throw new AppError("NOT_FOUND", "Referral not found", undefined, 404);

  validateReferralTransition(referral.status, "closed");

  const updated = await updateReferralStatus({ id: params.id, status: "closed" });
  await recordReferralEvent({
    referral_id: params.id,
    event_type: "closed",
    actor_id: params.ctx.userId,
  });
  return updated;
}

export { validateReferralConsent as validateReferralConsentForApplicant } from "./referralStateMachine";
