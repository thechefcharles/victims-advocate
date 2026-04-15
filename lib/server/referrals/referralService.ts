/**
 * Domain 4.1 — Referral service layer.
 * Orchestrates state machine, repository, and consent validation.
 */

import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { emitSignal } from "@/lib/server/trustSignal";
import { createNotification } from "@/lib/server/notifications/create";
import type { ReferralRow, CreateReferralInput } from "./referralTypes";
import {
  getReferralById,
  listReferralsForSourceOrg,
  listReferralsForTargetOrg,
  listReferralsForApplicantSafeView,
  insertReferral as dbCreateReferral,
  updateReferralStatus,
  recordReferralEvent,
} from "./referralRepository";
import { validateReferralTransition, validateReferralConsent } from "./referralStateMachine";

// Fire-and-forget applicant notification for a referral state transition.
function notifyApplicant(params: {
  applicantId: string;
  referralId: string;
  organizationId: string;
  type: string;
  title: string;
  body: string;
}): void {
  void createNotification(
    {
      userId: params.applicantId,
      organizationId: params.organizationId,
      type: params.type,
      title: params.title,
      body: params.body,
      previewSafe: true,
      metadata: { referral_id: params.referralId },
    },
    null,
  ).catch(() => {
    /* notifications are best-effort */
  });
}

function msBetween(later: string, earlier: string): number {
  const a = new Date(later).getTime();
  const b = new Date(earlier).getTime();
  return Math.max(0, a - b);
}

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
  notifyApplicant({
    applicantId: updated.applicant_id,
    referralId: updated.id,
    organizationId: updated.source_organization_id,
    type: "referral.submitted",
    title: "Your referral has been sent",
    body: "A provider organization has been asked to review your referral.",
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
  notifyApplicant({
    applicantId: updated.applicant_id,
    referralId: updated.id,
    organizationId: updated.target_organization_id,
    type: "referral.accepted",
    title: "A provider accepted your referral",
    body: "The provider you were referred to has accepted. They may reach out soon.",
  });

  // Trust signals — response time + acceptance (1).
  const respondedAt = updated.responded_at ?? new Date().toISOString();
  const supabase = getSupabaseAdmin();
  void emitSignal(
    {
      orgId: updated.target_organization_id,
      signalType: "referral.response_time",
      value: msBetween(respondedAt, updated.created_at),
      actorUserId: params.ctx.userId,
      actorAccountType: params.ctx.accountType,
      idempotencyKey: `${updated.target_organization_id}:referral.response_time:${updated.id}`,
      metadata: { referral_id: updated.id, outcome: "accepted" },
    },
    supabase,
  );
  void emitSignal(
    {
      orgId: updated.target_organization_id,
      signalType: "referral.acceptance_rate",
      value: 1,
      actorUserId: params.ctx.userId,
      actorAccountType: params.ctx.accountType,
      idempotencyKey: `${updated.target_organization_id}:referral.acceptance_rate:${updated.id}`,
      metadata: { referral_id: updated.id, outcome: "accepted" },
    },
    supabase,
  );

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
  notifyApplicant({
    applicantId: updated.applicant_id,
    referralId: updated.id,
    organizationId: updated.target_organization_id,
    type: "referral.rejected",
    title: "A referral was declined",
    body:
      "The provider you were referred to could not accept at this time. " +
      "You can still reach out to other providers.",
  });

  // Trust signals — response time + acceptance (0).
  const respondedAt = updated.responded_at ?? new Date().toISOString();
  const supabase = getSupabaseAdmin();
  void emitSignal(
    {
      orgId: updated.target_organization_id,
      signalType: "referral.response_time",
      value: msBetween(respondedAt, updated.created_at),
      actorUserId: params.ctx.userId,
      actorAccountType: params.ctx.accountType,
      idempotencyKey: `${updated.target_organization_id}:referral.response_time:${updated.id}`,
      metadata: { referral_id: updated.id, outcome: "rejected" },
    },
    supabase,
  );
  void emitSignal(
    {
      orgId: updated.target_organization_id,
      signalType: "referral.acceptance_rate",
      value: 0,
      actorUserId: params.ctx.userId,
      actorAccountType: params.ctx.accountType,
      idempotencyKey: `${updated.target_organization_id}:referral.acceptance_rate:${updated.id}`,
      metadata: { referral_id: updated.id, outcome: "rejected" },
    },
    supabase,
  );

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
  notifyApplicant({
    applicantId: updated.applicant_id,
    referralId: updated.id,
    organizationId: updated.target_organization_id,
    type: "referral.cancelled",
    title: "A referral was cancelled",
    body: "The referral was cancelled. No action is required from you.",
  });

  // Trust signals — response time only if previously pending_acceptance,
  // acceptance_rate 0 for any cancellation.
  const supabase = getSupabaseAdmin();
  if (referral.status === "pending_acceptance") {
    const respondedAt = updated.updated_at;
    void emitSignal(
      {
        orgId: updated.target_organization_id,
        signalType: "referral.response_time",
        value: msBetween(respondedAt, updated.created_at),
        actorUserId: params.ctx.userId,
        actorAccountType: params.ctx.accountType,
        idempotencyKey: `${updated.target_organization_id}:referral.response_time:${updated.id}`,
        metadata: { referral_id: updated.id, outcome: "cancelled" },
      },
      supabase,
    );
  }
  void emitSignal(
    {
      orgId: updated.target_organization_id,
      signalType: "referral.acceptance_rate",
      value: 0,
      actorUserId: params.ctx.userId,
      actorAccountType: params.ctx.accountType,
      idempotencyKey: `${updated.target_organization_id}:referral.acceptance_rate:${updated.id}`,
      metadata: { referral_id: updated.id, outcome: "cancelled" },
    },
    supabase,
  );

  return updated;
}

// ---------------------------------------------------------------------------
// Auto-cancel: referrals stuck in pending_acceptance beyond 14 days.
// Idempotent — the state machine rejects cancelling an already-cancelled row
// and we skip any that has moved past pending_acceptance between the query
// and the loop.
// ---------------------------------------------------------------------------

export async function cancelStaleReferrals(): Promise<{ cancelled: number }> {
  const supabase = getSupabaseAdmin();
  const cutoffIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("referrals")
    .select("id, applicant_id, target_organization_id, source_organization_id, created_at, status")
    .eq("status", "pending_acceptance")
    .lt("created_at", cutoffIso);
  const rows = (data ?? []) as Array<{
    id: string;
    applicant_id: string;
    target_organization_id: string;
    source_organization_id: string;
    created_at: string;
    status: string;
  }>;

  let cancelled = 0;
  const SYSTEM_USER = "00000000-0000-0000-0000-000000000000";

  for (const r of rows) {
    try {
      const updated = await updateReferralStatus({ id: r.id, status: "cancelled" });
      await recordReferralEvent({
        referral_id: r.id,
        event_type: "cancelled",
        actor_id: SYSTEM_USER,
        metadata: { reason: "auto_cancel_14_day", created_at: r.created_at },
      });
      notifyApplicant({
        applicantId: r.applicant_id,
        referralId: r.id,
        organizationId: r.target_organization_id,
        type: "referral.auto_cancelled",
        title: "A referral expired",
        body:
          "The provider did not respond within 14 days. You may wish to explore other providers.",
      });
      void emitSignal(
        {
          orgId: r.target_organization_id,
          signalType: "referral.response_time",
          value: msBetween(updated.updated_at, r.created_at),
          actorUserId: SYSTEM_USER,
          actorAccountType: "system",
          idempotencyKey: `${r.target_organization_id}:referral.response_time:${r.id}`,
          metadata: { referral_id: r.id, outcome: "auto_cancelled" },
        },
        supabase,
      );
      void emitSignal(
        {
          orgId: r.target_organization_id,
          signalType: "referral.acceptance_rate",
          value: 0,
          actorUserId: SYSTEM_USER,
          actorAccountType: "system",
          idempotencyKey: `${r.target_organization_id}:referral.acceptance_rate:${r.id}`,
          metadata: { referral_id: r.id, outcome: "auto_cancelled" },
        },
        supabase,
      );
      cancelled += 1;
    } catch {
      // Continue with the next row — best-effort batch.
    }
  }

  return { cancelled };
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
