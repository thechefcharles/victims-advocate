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
import { applyCaseOrganizationTransfer } from "@/lib/server/cases/transfer";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";
import { createCaseNotification } from "@/lib/server/notifications/create";
import { canOrganizationAppearInSearch } from "@/lib/organizations/profileStage";
import { createCaseOrgReferralInputSchema } from "./schema";
import type { CaseOrgReferralRow, CreateReferralInput, ReferralStatus } from "./types";
import {
  REFERRAL_METADATA_REVIEW_GRANT_USER_IDS,
  REFERRAL_METADATA_REVIEW_INSERTED_USER_IDS,
} from "./types";
import {
  grantReferralReviewCaseAccessForReceivingLeaders,
  revokeReferralInsertedReviewAccessAfterAccept,
  revokeReferralReviewCaseAccessForInsertedRecipients,
} from "./reviewAccess";

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
        "A referral to this organization is already in progress.",
        { reason: "referral_duplicate_pending" },
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
      [REFERRAL_METADATA_REVIEW_INSERTED_USER_IDS]: insertedReviewAccessUserIds,
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
      title: "Referral sent for review",
      description: `Sent to ${targetOrgName}. They can review and respond when ready.`,
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
          title: "Case referral needs review",
          body: "Open the case when you are ready to respond.",
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

export type CaseOrgReferralSummaryItem = {
  id: string;
  status: ReferralStatus;
  created_at: string;
  to_organization_id: string;
  to_organization_name: string;
};

/** Resolved target-org names for victim-facing referral status (uses same access as listReferralsForCase). */
export async function listCaseOrgReferralsSummaryForViewer(params: {
  ctx: AuthContext;
  caseId: string;
  req?: Request | null;
}): Promise<CaseOrgReferralSummaryItem[] | null> {
  const referrals = await listReferralsForCase(params);
  if (!referrals) return null;
  if (referrals.length === 0) return [];

  const supabase = getSupabaseAdmin();
  const ids = [...new Set(referrals.map((r) => r.to_organization_id))];
  const { data: orgs, error } = await supabase.from("organizations").select("id, name").in("id", ids);
  if (error) {
    throw new AppError("INTERNAL", "Failed to load organization names for referrals", undefined, 500);
  }
  const nameMap = new Map(
    (orgs ?? []).map((o) => [o.id as string, (((o.name as string) ?? "").trim() || "Organization")])
  );

  return referrals.map((r) => ({
    id: r.id,
    status: r.status,
    created_at: r.created_at,
    to_organization_id: r.to_organization_id,
    to_organization_name: nameMap.get(r.to_organization_id) ?? "Organization",
  }));
}

/**
 * Inbox-style list for a receiving organization (`to_organization_id`).
 * Non-admins must be org leadership for `organizationId === ctx.orgId`.
 */
export async function listReferralsForOrganization(params: {
  ctx: AuthContext;
  organizationId: string;
  /** When omitted, all statuses (newest first). */
  status?: ReferralStatus | ReferralStatus[];
}): Promise<CaseOrgReferralRow[] | null> {
  const { ctx, organizationId, status } = params;
  const oid = organizationId.trim();
  if (!oid) return null;

  const supabase = getSupabaseAdmin();

  const buildQuery = () => {
    let q = supabase.from("case_org_referrals").select("*").eq("to_organization_id", oid);
    if (status !== undefined) {
      const list = Array.isArray(status) ? status : [status];
      if (list.length === 1) {
        q = q.eq("status", list[0]);
      } else {
        q = q.in("status", list);
      }
    }
    return q;
  };

  if (ctx.isAdmin) {
    const { data, error } = await buildQuery().order("created_at", { ascending: false });
    if (error) throw new AppError("INTERNAL", "Failed to list referrals", undefined, 500);
    return (data ?? []).map((r) => asReferralRow(r as Record<string, unknown>));
  }

  if (!ctx.orgId || ctx.orgId !== oid || !isOrgLeadership(ctx.orgRole)) {
    return null;
  }

  const { data, error } = await buildQuery().order("created_at", { ascending: false });

  if (error) throw new AppError("INTERNAL", "Failed to list referrals", undefined, 500);
  return (data ?? []).map((r) => asReferralRow(r as Record<string, unknown>));
}

export type OrgReferralInboxItem = {
  referral: CaseOrgReferralRow;
  case: {
    id: string;
    name: string | null;
    status: string;
    owner_user_id: string;
    label: string;
  };
  from_organization: { id: string; name: string } | null;
};

function caseLabelFromRow(caseRow: Record<string, unknown>): string {
  const id = caseRow.id as string;
  const name = (caseRow.name as string | null | undefined)?.trim();
  if (name) return name;
  const app = caseRow.application as { victim?: { firstName?: string; lastName?: string } } | undefined;
  const first = (app?.victim?.firstName ?? "").trim();
  const last = (app?.victim?.lastName ?? "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  return `Case ${id.slice(0, 8)}…`;
}

function metadataStringArray(meta: Record<string, unknown>, key: string): string[] {
  const v = meta[key];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

/** Service-role load (caller must enforce auth). */
export async function loadCaseOrgReferralRow(referralId: string): Promise<CaseOrgReferralRow | null> {
  const id = referralId.trim();
  if (!id) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("case_org_referrals").select("*").eq("id", id).maybeSingle();
  if (error) throw new AppError("INTERNAL", "Failed to load referral", undefined, 500);
  if (!data) return null;
  return asReferralRow(data as Record<string, unknown>);
}

export function assertCanRespondToCaseOrgReferral(ctx: AuthContext, row: CaseOrgReferralRow): void {
  if (ctx.isAdmin) return;
  if (ctx.orgId === row.to_organization_id && isOrgLeadership(ctx.orgRole)) return;
  throw new AppError("FORBIDDEN", "Only receiving organization leadership can respond", undefined, 403);
}

/**
 * Accept referral: transfers case to receiving org (`applyCaseOrganizationTransfer`), then marks referral accepted.
 * Phase 5: notification/access polish.
 */
export async function acceptCaseOrgReferral(params: {
  ctx: AuthContext;
  referralId: string;
  req?: Request | null;
}): Promise<CaseOrgReferralRow> {
  const { ctx, referralId, req } = params;
  const row = await loadCaseOrgReferralRow(referralId);
  if (!row) throw new AppError("NOT_FOUND", "Referral not found", undefined, 404);
  assertCanRespondToCaseOrgReferral(ctx, row);

  if (row.status !== "pending") {
    throw new AppError(
      "VALIDATION_ERROR",
      "This referral is not pending and cannot be accepted again",
      undefined,
      422
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: caseRow, error: caseFetchErr } = await supabase
    .from("cases")
    .select("id, organization_id, owner_user_id, name")
    .eq("id", row.case_id)
    .maybeSingle();
  if (caseFetchErr || !caseRow) {
    throw new AppError("NOT_FOUND", "Case not found", undefined, 404);
  }

  const { data: toOrg } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", row.to_organization_id)
    .maybeSingle();
  const toName = ((toOrg?.name as string) ?? "").trim() || "Organization";

  const transferResult = await applyCaseOrganizationTransfer({
    caseId: row.case_id,
    targetOrganizationId: row.to_organization_id,
  });

  const now = new Date().toISOString();
  const { data: updated, error: updErr } = await supabase
    .from("case_org_referrals")
    .update({
      status: "accepted",
      responded_at: now,
      responded_by_user_id: ctx.userId,
      updated_at: now,
    })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (updErr || !updated) {
    logger.error("referral.accept.referral_row_update_failed_after_transfer", {
      referralId: row.id,
      caseId: row.case_id,
      message: updErr?.message,
    });
    throw new AppError(
      "INTERNAL",
      "The case was transferred but the referral could not be marked accepted. Please contact support.",
      { referralId: row.id, caseId: row.case_id },
      500
    );
  }

  const out = asReferralRow(updated as Record<string, unknown>);

  const insertedForCleanup = metadataStringArray(row.metadata, REFERRAL_METADATA_REVIEW_INSERTED_USER_IDS);
  if (insertedForCleanup.length > 0) {
    try {
      await revokeReferralInsertedReviewAccessAfterAccept({
        caseId: row.case_id,
        postTransferOrganizationId: row.to_organization_id,
        insertedUserIds: insertedForCleanup,
        keepUserId: ctx.userId,
      });
    } catch (cleanupErr) {
      logger.warn("referral.accept.review_access_cleanup_failed", {
        referralId: row.id,
        message: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
      });
    }
  }

  try {
    await appendCaseTimelineEvent({
      caseId: row.case_id,
      organizationId: row.to_organization_id,
      actor: { userId: ctx.userId, role: ctx.role },
      eventType: "case.referral_handoff_completed",
      title: "Organization connection updated",
      description: `Your case is now connected to ${toName} after they accepted your referral.`,
      metadata: {
        referral_id: row.id,
        from_organization_id: transferResult.previousOrganizationId,
        to_organization_id: row.to_organization_id,
      },
    });
  } catch (timelineErr) {
    logger.warn("referral.accept.timeline_failed", {
      referralId: row.id,
      message: timelineErr instanceof Error ? timelineErr.message : String(timelineErr),
    });
  }

  await logEvent({
    ctx,
    action: "case.organization_transferred",
    resourceType: "case",
    resourceId: row.case_id,
    organizationId: row.to_organization_id,
    metadata: {
      from_organization_id: transferResult.previousOrganizationId,
      to_organization_id: row.to_organization_id,
      source: "referral_accept",
      referral_id: row.id,
    },
    req: req ?? undefined,
  });

  const ownerId = (caseRow.owner_user_id as string) ?? null;
  const recipients = new Set<string>();
  if (ownerId) recipients.add(ownerId);
  if (row.requested_by_user_id && row.requested_by_user_id !== ownerId) {
    recipients.add(row.requested_by_user_id);
  }

  const victimOrgUrl = `/victim/case/${encodeURIComponent(row.case_id)}/organization`;
  const intakeUrl = `/compensation/intake?case=${encodeURIComponent(row.case_id)}`;

  if (ownerId) {
    try {
      await createCaseNotification(
        {
          recipients: [ownerId],
          caseId: row.case_id,
          organizationId: row.to_organization_id,
          type: "referral.accepted",
          title: "Referral accepted",
          body: "Your case is connected to the organization you chose.",
          actionUrl: victimOrgUrl,
          previewSafe: true,
          metadata: { referralId: row.id },
        },
        ctx
      );
    } catch (notifyErr) {
      logger.warn("referral.accept.notification_failed", {
        referralId: row.id,
        message: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
      });
    }
  }

  const nonOwnerRecipients = [...recipients].filter((id) => !ownerId || id !== ownerId);
  if (nonOwnerRecipients.length > 0) {
    try {
      await createCaseNotification(
        {
          recipients: nonOwnerRecipients,
          caseId: row.case_id,
          organizationId: row.to_organization_id,
          type: "referral.accepted",
          title: "Referral accepted",
          body: "The case was transferred to the receiving organization.",
          actionUrl: intakeUrl,
          previewSafe: true,
          metadata: { referralId: row.id },
        },
        ctx
      );
    } catch (notifyErr) {
      logger.warn("referral.accept.notification_failed", {
        referralId: row.id,
        message: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
      });
    }
  }

  await logEvent({
    ctx,
    action: "referral.accepted",
    resourceType: "case_org_referral",
    resourceId: row.id,
    organizationId: row.to_organization_id,
    metadata: {
      caseId: row.case_id,
      toOrganizationId: row.to_organization_id,
      previousOrganizationId: transferResult.previousOrganizationId,
      transferred: true,
      actorRole: ctx.role,
      orgRole: ctx.orgRole ?? null,
    },
    req: req ?? undefined,
  });

  return out;
}

export async function declineCaseOrgReferral(params: {
  ctx: AuthContext;
  referralId: string;
  req?: Request | null;
}): Promise<CaseOrgReferralRow> {
  const { ctx, referralId, req } = params;
  const row = await loadCaseOrgReferralRow(referralId);
  if (!row) throw new AppError("NOT_FOUND", "Referral not found", undefined, 404);
  assertCanRespondToCaseOrgReferral(ctx, row);

  if (row.status !== "pending") {
    throw new AppError(
      "VALIDATION_ERROR",
      "This referral is not pending and cannot be declined again",
      undefined,
      422
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: caseRow } = await supabase
    .from("cases")
    .select("id, organization_id, owner_user_id")
    .eq("id", row.case_id)
    .maybeSingle();
  const caseTenantOrgId = (caseRow?.organization_id as string) ?? "";

  const insertedIds = metadataStringArray(row.metadata, REFERRAL_METADATA_REVIEW_INSERTED_USER_IDS);

  const now = new Date().toISOString();
  const { data: updated, error: updErr } = await supabase
    .from("case_org_referrals")
    .update({
      status: "declined",
      responded_at: now,
      responded_by_user_id: ctx.userId,
      updated_at: now,
    })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (updErr || !updated) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This referral is no longer pending",
      undefined,
      422
    );
  }

  const out = asReferralRow(updated as Record<string, unknown>);

  if (caseTenantOrgId && insertedIds.length > 0) {
    try {
      await revokeReferralReviewCaseAccessForInsertedRecipients({
        caseId: row.case_id,
        caseTenantOrganizationId: caseTenantOrgId,
        insertedUserIds: insertedIds,
      });
    } catch (revokeErr) {
      logger.warn("referral.decline.revoke_access_failed", {
        referralId: row.id,
        message: revokeErr instanceof Error ? revokeErr.message : String(revokeErr),
      });
    }
  }

  const { data: toOrg } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", row.to_organization_id)
    .maybeSingle();
  const toName = ((toOrg?.name as string) ?? "").trim() || "Organization";

  try {
    await appendCaseTimelineEvent({
      caseId: row.case_id,
      organizationId: caseTenantOrgId,
      actor: { userId: ctx.userId, role: ctx.role },
      eventType: "case.referral_declined",
      title: "Referral declined",
      description: `${toName} declined the referral.`,
      metadata: { referral_id: row.id, to_organization_id: row.to_organization_id },
    });
  } catch (timelineErr) {
    logger.warn("referral.decline.timeline_failed", {
      referralId: row.id,
      message: timelineErr instanceof Error ? timelineErr.message : String(timelineErr),
    });
  }

  const ownerId = (caseRow?.owner_user_id as string) ?? null;
  const recipients = new Set<string>();
  if (ownerId) recipients.add(ownerId);
  if (row.requested_by_user_id && row.requested_by_user_id !== ownerId) {
    recipients.add(row.requested_by_user_id);
  }

  const victimOrgUrlDecline = `/victim/case/${encodeURIComponent(row.case_id)}/organization`;
  const intakeUrlDecline = `/compensation/intake?case=${encodeURIComponent(row.case_id)}`;

  if (ownerId) {
    try {
      await createCaseNotification(
        {
          recipients: [ownerId],
          caseId: row.case_id,
          organizationId: caseTenantOrgId || null,
          type: "referral.declined",
          title: "Referral declined",
          body: "The organization chose not to take this case right now.",
          actionUrl: victimOrgUrlDecline,
          previewSafe: true,
          metadata: { referralId: row.id },
        },
        ctx
      );
    } catch (notifyErr) {
      logger.warn("referral.decline.notification_failed", {
        referralId: row.id,
        message: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
      });
    }
  }

  const nonOwnerRecipientsDecline = [...recipients].filter((id) => !ownerId || id !== ownerId);
  if (nonOwnerRecipientsDecline.length > 0) {
    try {
      await createCaseNotification(
        {
          recipients: nonOwnerRecipientsDecline,
          caseId: row.case_id,
          organizationId: caseTenantOrgId || null,
          type: "referral.declined",
          title: "Referral declined",
          body: "The receiving organization declined the referral.",
          actionUrl: intakeUrlDecline,
          previewSafe: true,
          metadata: { referralId: row.id },
        },
        ctx
      );
    } catch (notifyErr) {
      logger.warn("referral.decline.notification_failed", {
        referralId: row.id,
        message: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
      });
    }
  }

  await logEvent({
    ctx,
    action: "referral.declined",
    resourceType: "case_org_referral",
    resourceId: row.id,
    organizationId: row.to_organization_id,
    metadata: {
      caseId: row.case_id,
      toOrganizationId: row.to_organization_id,
      actorRole: ctx.role,
      orgRole: ctx.orgRole ?? null,
    },
    req: req ?? undefined,
  });

  return out;
}

export async function listOrgReferralsInboxEnriched(params: {
  ctx: AuthContext;
  organizationId: string;
  status?: ReferralStatus | ReferralStatus[];
}): Promise<OrgReferralInboxItem[] | null> {
  const referrals = await listReferralsForOrganization(params);
  if (!referrals) return null;
  if (referrals.length === 0) return [];

  const supabase = getSupabaseAdmin();
  const caseIds = [...new Set(referrals.map((r) => r.case_id))];
  const { data: cases, error: cErr } = await supabase
    .from("cases")
    .select("id, name, status, owner_user_id, application")
    .in("id", caseIds);
  if (cErr) throw new AppError("INTERNAL", "Failed to load cases for inbox", undefined, 500);
  const caseMap = new Map((cases ?? []).map((c) => [c.id as string, c as Record<string, unknown>]));

  const fromOrgIds = [
    ...new Set(referrals.map((r) => r.from_organization_id).filter((x): x is string => x != null)),
  ];
  let fromOrgMap = new Map<string, { id: string; name: string }>();
  if (fromOrgIds.length > 0) {
    const { data: orgs, error: oErr } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", fromOrgIds);
    if (oErr) throw new AppError("INTERNAL", "Failed to load organizations for inbox", undefined, 500);
    fromOrgMap = new Map(
      (orgs ?? []).map((o) => [
        o.id as string,
        { id: o.id as string, name: ((o.name as string) ?? "").trim() || "Organization" },
      ])
    );
  }

  return referrals.map((referral) => {
    const c = caseMap.get(referral.case_id);
    const casePart = c
      ? {
          id: c.id as string,
          name: (c.name as string | null) ?? null,
          status: (c.status as string) ?? "",
          owner_user_id: c.owner_user_id as string,
          label: caseLabelFromRow(c),
        }
      : {
          id: referral.case_id,
          name: null,
          status: "",
          owner_user_id: "",
          label: `Case ${referral.case_id.slice(0, 8)}…`,
        };

    const fid = referral.from_organization_id;
    const from_organization = fid ? (fromOrgMap.get(fid) ?? { id: fid, name: "Organization" }) : null;

    return { referral, case: casePart, from_organization };
  });
}
