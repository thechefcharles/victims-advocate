/**
 * Case org referrals — create, read, list, and Phase 2 side effects (review access, timeline, notifications).
 *
 * Phase 3+: org inbox, accept/decline, revoke review access, shared org transfer helper.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { isOrgLeadership } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { getCaseById, appendCaseTimelineEvent } from "@/lib/server/data";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";
import { createCaseNotification } from "@/lib/server/notifications/create";
import { canOrganizationAppearInSearch } from "@/lib/organizations/profileStage";
import { createCaseOrgReferralInputSchema } from "./schema";
import type { CaseOrgReferralRow, CreateReferralInput, ReferralStatus } from "./types";
import { REFERRAL_METADATA_REVIEW_GRANT_USER_IDS } from "./types";
import { grantReferralReviewCaseAccessForReceivingLeaders } from "./reviewAccess";

function asReferralRow(row: Record<string, unknown>): CaseOrgReferralRow {
  const meta = row.metadata;
  return {
    id: row.id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    case_id: row.case_id as string,
    from_organization_id: (row.from_organization_id as string | null) ?? null,
    to_organization_id: row.to_organization_id as string,
    requested_by_user_id: row.requested_by_user_id as string,
    status: row.status as ReferralStatus,
    responded_at: (row.responded_at as string | null) ?? null,
    responded_by_user_id: (row.responded_by_user_id as string | null) ?? null,
    metadata:
      meta && typeof meta === "object" && !Array.isArray(meta)
        ? (meta as Record<string, unknown>)
        : {},
  };
}

/** Case owner, org staff with case access, explicit case_access, or admin. */
async function canViewCase(params: {
  ctx: AuthContext;
  caseId: string;
  req?: Request | null;
}): Promise<boolean> {
  const { ctx, caseId, req } = params;
  if (ctx.isAdmin) return true;
  const result = await getCaseById({ caseId, ctx, req });
  return result != null;
}

function canViewReferralAsReceivingLeadership(ctx: AuthContext, row: CaseOrgReferralRow): boolean {
  if (!ctx.orgId || ctx.orgId !== row.to_organization_id) return false;
  return isOrgLeadership(ctx.orgRole);
}

/**
 * Referral creation: case owner, or anyone with edit-capable case access, or admin (case must exist).
 */
async function assertCanInitiateCaseOrgReferral(params: {
  ctx: AuthContext;
  caseId: string;
  req?: Request | null;
}): Promise<void> {
  const { ctx, caseId, req } = params;
  const supabase = getSupabaseAdmin();

  if (ctx.isAdmin) {
    const { data, error } = await supabase.from("cases").select("id").eq("id", caseId).maybeSingle();
    if (error) throw new AppError("INTERNAL", "Case lookup failed", undefined, 500);
    if (!data) throw new AppError("NOT_FOUND", "Case not found", undefined, 404);
    return;
  }

  const result = await getCaseById({ caseId, ctx, req });
  if (!result) {
    throw new AppError("FORBIDDEN", "Access denied", undefined, 403);
  }
  const { access } = result;
  if (access.role === "owner" || access.can_edit === true) {
    return;
  }
  throw new AppError("FORBIDDEN", "You do not have permission to refer this case", undefined, 403);
}

type TargetOrgRow = {
  id: string;
  name: string | null;
  status: string | null;
  lifecycle_status: string | null;
  public_profile_status: string | null;
  profile_status: string | null;
  profile_stage: string | null;
};

async function loadReferralTargetOrganization(organizationId: string): Promise<TargetOrgRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id, name, status, lifecycle_status, public_profile_status, profile_status, profile_stage"
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Organization lookup failed", undefined, 500);
  }
  if (!data) {
    throw new AppError("NOT_FOUND", "Organization not found", undefined, 404);
  }
  return data as TargetOrgRow;
}

function assertReferralTargetEligibleForDiscovery(org: TargetOrgRow): void {
  if (!canOrganizationAppearInSearch(org)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "That organization is not available as a referral target in the directory",
      undefined,
      422
    );
  }
}

/**
 * Create a pending referral, grant receiving-org leadership read-only case access, timeline + notifications.
 */
export async function createReferral(params: {
  ctx: AuthContext;
  input: CreateReferralInput;
  req?: Request | null;
}): Promise<CaseOrgReferralRow> {
  const { ctx, input, req } = params;

  const parsed = createCaseOrgReferralInputSchema.safeParse({
    caseId: input.caseId.trim(),
    toOrganizationId: input.toOrganizationId.trim(),
    fromOrganizationId: input.fromOrganizationId,
    metadata: input.metadata,
  });
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid referral payload", parsed.error.flatten(), 422);
  }

  const { caseId, toOrganizationId, fromOrganizationId: fromInput, metadata: clientMetadata } =
    parsed.data;

  await assertCanInitiateCaseOrgReferral({ ctx, caseId, req });

  const supabase = getSupabaseAdmin();
  const { data: caseRow, error: caseErr } = await supabase
    .from("cases")
    .select("id, organization_id")
    .eq("id", caseId)
    .maybeSingle();

  if (caseErr || !caseRow) {
    throw new AppError("NOT_FOUND", "Case not found", undefined, 404);
  }

  const caseTenantOrgId = caseRow.organization_id as string;
  if (toOrganizationId === caseTenantOrgId) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This case already belongs to that organization. Choose a different organization to refer.",
      undefined,
      422
    );
  }

  const resolvedFromOrgId = fromInput ?? caseTenantOrgId;
  if (resolvedFromOrgId === toOrganizationId) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Referral cannot target the same organization as the sending organization",
      undefined,
      422
    );
  }

  const targetOrg = await loadReferralTargetOrganization(toOrganizationId);
  assertReferralTargetEligibleForDiscovery(targetOrg);

  const metadataBase: Record<string, unknown> = {
    ...(clientMetadata ?? {}),
  };

  const { data, error } = await supabase
    .from("case_org_referrals")
    .insert({
      case_id: caseId,
      from_organization_id: resolvedFromOrgId,
      to_organization_id: toOrganizationId,
      requested_by_user_id: ctx.userId,
      status: "pending",
      metadata: metadataBase,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new AppError(
        "VALIDATION_ERROR",
        "A pending referral for this case to this organization already exists",
        undefined,
        422
      );
    }
    throw new AppError("INTERNAL", "Failed to create referral", undefined, 500);
  }

  let row = asReferralRow(data as Record<string, unknown>);

  const targetOrgName = (targetOrg.name ?? "").trim() || "Organization";
  let grantUserIds: string[] = [];
  let insertedReviewAccessUserIds: string[] = [];
  try {
    const grantResult = await grantReferralReviewCaseAccessForReceivingLeaders({
      caseId,
      caseTenantOrganizationId: caseTenantOrgId,
      receivingOrganizationId: toOrganizationId,
    });
    grantUserIds = grantResult.grantedUserIds;
    insertedReviewAccessUserIds = grantResult.insertedUserIds;

    const mergedMeta: Record<string, unknown> = {
      ...row.metadata,
      [REFERRAL_METADATA_REVIEW_GRANT_USER_IDS]: grantUserIds,
    };

    const { data: updated, error: updErr } = await supabase
      .from("case_org_referrals")
      .update({
        metadata: mergedMeta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .select("*")
      .single();

    if (updErr || !updated) {
      throw new AppError("INTERNAL", "Failed to update referral metadata", undefined, 500);
    }
    row = asReferralRow(updated as Record<string, unknown>);
  } catch (e) {
    for (const uid of insertedReviewAccessUserIds) {
      await supabase.from("case_access").delete().eq("case_id", caseId).eq("user_id", uid);
    }
    await supabase.from("case_org_referrals").delete().eq("id", row.id);
    throw e;
  }

  try {
    await appendCaseTimelineEvent({
      caseId,
      organizationId: caseTenantOrgId,
      actor: { userId: ctx.userId, role: ctx.role },
      eventType: "case.referral_sent",
      title: "Referral sent to organization",
      description: `A referral was sent to ${targetOrgName} for review.`,
      metadata: {
        referral_id: row.id,
        to_organization_id: toOrganizationId,
      },
    });
  } catch (timelineErr) {
    logger.warn("referral.create.timeline_failed", {
      caseId,
      referralId: row.id,
      message: timelineErr instanceof Error ? timelineErr.message : String(timelineErr),
    });
  }

  if (grantUserIds.length > 0) {
    try {
      await createCaseNotification(
        {
          recipients: grantUserIds,
          caseId,
          organizationId: toOrganizationId,
          type: "referral.pending_review",
          title: "New case referral",
          body: null,
          actionUrl: `/compensation/intake?case=${encodeURIComponent(caseId)}`,
          previewSafe: true,
          metadata: { referralId: row.id, caseId },
        },
        ctx
      );
    } catch (notifyErr) {
      logger.warn("referral.create.notification_failed", {
        caseId,
        referralId: row.id,
        message: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
      });
    }
  }

  await logEvent({
    ctx,
    action: "referral.created",
    resourceType: "case_org_referral",
    resourceId: row.id,
    organizationId: resolvedFromOrgId,
    metadata: {
      caseId,
      toOrganizationId,
      fromOrganizationId: resolvedFromOrgId,
      actorRole: ctx.role,
      orgRole: ctx.orgRole ?? null,
    },
    req: req ?? undefined,
  });

  return row;
}

/** Single referral by id with read guard. */
export async function getReferralById(params: {
  ctx: AuthContext;
  referralId: string;
  req?: Request | null;
}): Promise<CaseOrgReferralRow | null> {
  const { ctx, referralId, req } = params;
  const id = referralId.trim();
  if (!id) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("case_org_referrals").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Failed to load referral", undefined, 500);
  }
  if (!data) return null;

  const row = asReferralRow(data as Record<string, unknown>);

  if (ctx.isAdmin) return row;
  if (await canViewCase({ ctx, caseId: row.case_id, req })) return row;
  if (canViewReferralAsReceivingLeadership(ctx, row)) return row;

  return null;
}

/**
 * List referrals for a case.
 * Full list: admin or anyone with case access.
 * Receiving org leadership without case access: only rows where `to_organization_id` is their org.
 */
export async function listReferralsForCase(params: {
  ctx: AuthContext;
  caseId: string;
  req?: Request | null;
}): Promise<CaseOrgReferralRow[] | null> {
  const { ctx, caseId, req } = params;
  const cid = caseId.trim();
  if (!cid) return null;

  const supabase = getSupabaseAdmin();

  if (ctx.isAdmin) {
    const { data, error } = await supabase
      .from("case_org_referrals")
      .select("*")
      .eq("case_id", cid)
      .order("created_at", { ascending: false });
    if (error) throw new AppError("INTERNAL", "Failed to list referrals", undefined, 500);
    return (data ?? []).map((r) => asReferralRow(r as Record<string, unknown>));
  }

  if (await canViewCase({ ctx, caseId: cid, req })) {
    const { data, error } = await supabase
      .from("case_org_referrals")
      .select("*")
      .eq("case_id", cid)
      .order("created_at", { ascending: false });
    if (error) throw new AppError("INTERNAL", "Failed to list referrals", undefined, 500);
    return (data ?? []).map((r) => asReferralRow(r as Record<string, unknown>));
  }

  if (ctx.orgId && isOrgLeadership(ctx.orgRole)) {
    const { data, error } = await supabase
      .from("case_org_referrals")
      .select("*")
      .eq("case_id", cid)
      .eq("to_organization_id", ctx.orgId)
      .order("created_at", { ascending: false });
    if (error) throw new AppError("INTERNAL", "Failed to list referrals", undefined, 500);
    return (data ?? []).map((r) => asReferralRow(r as Record<string, unknown>));
  }

  return null;
}

/**
 * Inbox-style list for a receiving organization (`to_organization_id`).
 * Non-admins must be org leadership for `organizationId === ctx.orgId`.
 */
export async function listReferralsForOrganization(params: {
  ctx: AuthContext;
  organizationId: string;
}): Promise<CaseOrgReferralRow[] | null> {
  const { ctx, organizationId } = params;
  const oid = organizationId.trim();
  if (!oid) return null;

  if (ctx.isAdmin) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("case_org_referrals")
      .select("*")
      .eq("to_organization_id", oid)
      .order("created_at", { ascending: false });
    if (error) throw new AppError("INTERNAL", "Failed to list referrals", undefined, 500);
    return (data ?? []).map((r) => asReferralRow(r as Record<string, unknown>));
  }

  if (!ctx.orgId || ctx.orgId !== oid || !isOrgLeadership(ctx.orgRole)) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("case_org_referrals")
    .select("*")
    .eq("to_organization_id", oid)
    .order("created_at", { ascending: false });

  if (error) throw new AppError("INTERNAL", "Failed to list referrals", undefined, 500);
  return (data ?? []).map((r) => asReferralRow(r as Record<string, unknown>));
}
