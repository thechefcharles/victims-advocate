/**
 * Case org referrals — persistence and read guards only.
 *
 * Phase 2+: wire UI, grant temporary read-only case_access for receiving org reviewers,
 * send notifications, append timeline events, call shared org transfer helper on accept.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { isOrgLeadership } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { getCaseById } from "@/lib/server/data";
import { logEvent } from "@/lib/server/audit/logEvent";
import { createReferralPayloadSchema } from "./schema";
import type { CaseOrgReferralRow, CreateReferralInput, ReferralStatus } from "./types";

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

async function assertOrganizationExists(organizationId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) {
    throw new AppError("INTERNAL", "Organization lookup failed", undefined, 500);
  }
  if (!data) {
    throw new AppError("NOT_FOUND", "Organization not found", undefined, 404);
  }
}

/**
 * Create a pending referral. No access grants, transfer, or notifications.
 * Caller must be admin or have normal case view access to the case.
 */
export async function createReferral(params: {
  ctx: AuthContext;
  input: CreateReferralInput;
  req?: Request | null;
}): Promise<CaseOrgReferralRow> {
  const { ctx, input, req } = params;

  const parsed = createReferralPayloadSchema.safeParse({
    caseId: input.caseId.trim(),
    fromOrganizationId: input.fromOrganizationId,
    toOrganizationId: input.toOrganizationId.trim(),
    metadata: input.metadata,
  });
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid referral payload", parsed.error.flatten(), 422);
  }

  const { caseId, fromOrganizationId, toOrganizationId, metadata } = parsed.data;

  if (fromOrganizationId != null && fromOrganizationId === toOrganizationId) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Referral cannot target the same organization as the sending organization",
      undefined,
      422
    );
  }

  const allowed =
    ctx.isAdmin || (await canViewCase({ ctx, caseId, req }));
  if (!allowed) {
    throw new AppError("FORBIDDEN", "Access denied", undefined, 403);
  }

  await assertOrganizationExists(toOrganizationId);
  if (fromOrganizationId != null) {
    await assertOrganizationExists(fromOrganizationId);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("case_org_referrals")
    .insert({
      case_id: caseId,
      from_organization_id: fromOrganizationId,
      to_organization_id: toOrganizationId,
      requested_by_user_id: ctx.userId,
      status: "pending",
      metadata: metadata ?? {},
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

  const row = asReferralRow(data as Record<string, unknown>);

  const caseResult = await getCaseById({ caseId, ctx, req });
  const orgForAudit =
    fromOrganizationId ?? (caseResult?.case?.organization_id as string | null | undefined) ?? null;

  await logEvent({
    ctx,
    action: "referral.created",
    resourceType: "case_org_referral",
    resourceId: row.id,
    organizationId: orgForAudit,
    metadata: {
      caseId,
      toOrganizationId,
      fromOrganizationId,
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
