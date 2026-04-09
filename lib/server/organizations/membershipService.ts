/**
 * Domain 3.2 — Org membership service.
 * Extracted from app/api/org/members/* and related route handlers.
 * All auth decisions go through can() per Rule 17.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { normalizeOrgRoleInput, ORG_SELF_SERVE_INVITE_ROLES } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/auth";
import { logEvent } from "@/lib/server/audit/logEvent";
import {
  serializeMemberView,
  serializeJoinRequestView,
  type MemberView,
  type JoinRequestView,
  type OrgMembershipRow,
} from "./memberSerializers";

// ---------------------------------------------------------------------------
// listOrgMembers
// ---------------------------------------------------------------------------

export type MemberViewWithEmail = MemberView & { email: string | null };

export async function listOrgMembers(
  orgId: string,
  ctx: AuthContext,
): Promise<MemberViewWithEmail[]> {
  const actor = buildActor(ctx);
  const decision = await can("org:view_members", actor, { type: "org", id: orgId, ownerId: orgId });
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Cannot list members.", undefined, 403);
  }

  const supabase = getSupabaseAdmin();
  const { data: members, error } = await supabase
    .from("org_memberships")
    .select("id, created_at, user_id, org_role, status, organization_id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw new AppError("INTERNAL", "Failed to list members.", undefined, 500);

  // Enrich with profile emails (non-blocking — email may not exist)
  const userIds = [...new Set((members ?? []).map((m) => m.user_id))];
  const profileMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      const row = p as { id: string; email?: string };
      profileMap.set(row.id, row.email ?? null);
    }
  }

  return (members ?? []).map((m) => ({
    ...serializeMemberView(m as OrgMembershipRow),
    email: profileMap.get(m.user_id) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// updateMemberRole
// ---------------------------------------------------------------------------

export async function updateMemberRole(
  params: { memberId: string; newRole: string },
  ctx: AuthContext,
  req?: Request,
): Promise<MemberView> {
  const orgId = ctx.orgId;
  if (!orgId) throw new AppError("FORBIDDEN", "Organization context required.", undefined, 403);

  const actor = buildActor(ctx);
  const decision = await can("org:update_member_role", actor, { type: "org", id: orgId, ownerId: orgId });
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Cannot update member role.", undefined, 403);
  }

  // Normalize and validate the role
  const normalized = normalizeOrgRoleInput(params.newRole);
  if (!normalized) {
    throw new AppError("VALIDATION_ERROR", `Invalid org_role: ${params.newRole}`, undefined, 422);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("org_memberships")
    .update({ org_role: normalized })
    .eq("id", params.memberId)
    .eq("organization_id", orgId) // cross-org guard
    .select("*")
    .maybeSingle();

  if (error) throw new AppError("INTERNAL", "Failed to update member role.", undefined, 500);
  if (!data) throw new AppError("NOT_FOUND", "Member not found.", undefined, 404);

  void logEvent({
    ctx,
    action: "org.member.role_change",
    resourceType: "org_membership",
    resourceId: params.memberId,
    organizationId: orgId,
    metadata: { new_role: normalized },
    req: req ?? null,
  }).catch(() => {});

  return serializeMemberView(data as OrgMembershipRow);
}

// ---------------------------------------------------------------------------
// revokeOrgMembership
// ---------------------------------------------------------------------------

export async function revokeOrgMembership(
  memberId: string,
  ctx: AuthContext,
  req?: Request,
): Promise<void> {
  const orgId = ctx.orgId;
  if (!orgId) throw new AppError("FORBIDDEN", "Organization context required.", undefined, 403);

  const actor = buildActor(ctx);
  const decision = await can("org:revoke_member", actor, { type: "org", id: orgId, ownerId: orgId });
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Cannot revoke membership.", undefined, 403);
  }

  const supabase = getSupabaseAdmin();

  // Check current state to avoid no-op and to detect already-revoked
  const { data: existing } = await supabase
    .from("org_memberships")
    .select("id, status")
    .eq("id", memberId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!existing) throw new AppError("NOT_FOUND", "Member not found.", undefined, 404);
  if ((existing as { status: string }).status === "revoked") {
    throw new AppError("CONFLICT", "Membership is already revoked.", undefined, 409);
  }

  const { error } = await supabase
    .from("org_memberships")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: ctx.userId,
    })
    .eq("id", memberId)
    .eq("organization_id", orgId);

  if (error) throw new AppError("INTERNAL", "Failed to revoke membership.", undefined, 500);

  void logEvent({
    ctx,
    action: "org.member.revoke",
    resourceType: "org_membership",
    resourceId: memberId,
    organizationId: orgId,
    metadata: {},
    req: req ?? null,
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// createJoinRequest
// ---------------------------------------------------------------------------

export async function createJoinRequest(
  params: { organizationId: string; notes?: string },
  ctx: AuthContext,
): Promise<JoinRequestView> {
  const actor = buildActor(ctx);
  const decision = await can("org:request_to_join", actor, {
    type: "org",
    id: params.organizationId,
    ownerId: params.organizationId,
  });
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Cannot request to join.", undefined, 403);
  }

  const supabase = getSupabaseAdmin();

  // Check no existing pending request
  const { data: existing } = await supabase
    .from("advocate_org_join_requests")
    .select("id")
    .eq("advocate_user_id", ctx.userId)
    .eq("organization_id", params.organizationId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    throw new AppError("CONFLICT", "A pending join request already exists.", undefined, 409);
  }

  const { data, error } = await supabase
    .from("advocate_org_join_requests")
    .insert({
      advocate_user_id: ctx.userId,
      organization_id: params.organizationId,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to create join request.", undefined, 500);
  }

  const row = data as Record<string, unknown>;
  return serializeJoinRequestView({
    id: String(row.id),
    organization_id: String(row.organization_id),
    user_id: String(row.advocate_user_id),
    requested_role: null,
    status: String(row.status),
    created_at: String(row.created_at),
    notes: null,
  });
}

// ---------------------------------------------------------------------------
// approveJoinRequest
// ---------------------------------------------------------------------------

export async function approveJoinRequest(
  requestId: string,
  ctx: AuthContext,
  req?: Request,
): Promise<MemberView> {
  const orgId = ctx.orgId;
  if (!orgId) throw new AppError("FORBIDDEN", "Organization context required.", undefined, 403);

  const actor = buildActor(ctx);
  const decision = await can("org:approve_join", actor, { type: "org", id: orgId, ownerId: orgId });
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Cannot approve join request.", undefined, 403);
  }

  const supabase = getSupabaseAdmin();

  const { data: joinReq } = await supabase
    .from("advocate_org_join_requests")
    .select("*")
    .eq("id", requestId)
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .maybeSingle();

  if (!joinReq) {
    throw new AppError("NOT_FOUND", "Join request not found or already resolved.", undefined, 404);
  }

  const row = joinReq as Record<string, unknown>;
  const advocateUserId = String(row.advocate_user_id);

  // Default to victim_advocate for join requests
  const orgRole = ORG_SELF_SERVE_INVITE_ROLES.includes("victim_advocate" as never)
    ? "victim_advocate"
    : "victim_advocate";

  const { data: membership, error: memberErr } = await supabase
    .from("org_memberships")
    .insert({
      user_id: advocateUserId,
      organization_id: orgId,
      org_role: orgRole,
      status: "active",
      created_by: ctx.userId,
    })
    .select("*")
    .single();

  if (memberErr || !membership) {
    throw new AppError("INTERNAL", "Failed to create membership.", undefined, 500);
  }

  // Mark request approved
  await supabase
    .from("advocate_org_join_requests")
    .update({ status: "approved", resolved_at: new Date().toISOString(), resolved_by: ctx.userId })
    .eq("id", requestId);

  void logEvent({
    ctx,
    action: "org.join_request.approved",
    resourceType: "advocate_org_join_request",
    resourceId: requestId,
    organizationId: orgId,
    metadata: { advocate_user_id: advocateUserId },
    req: req ?? null,
  }).catch(() => {});

  return serializeMemberView(membership as OrgMembershipRow);
}

// ---------------------------------------------------------------------------
// declineJoinRequest
// ---------------------------------------------------------------------------

export async function declineJoinRequest(
  requestId: string,
  ctx: AuthContext,
  req?: Request,
): Promise<void> {
  const orgId = ctx.orgId;
  if (!orgId) throw new AppError("FORBIDDEN", "Organization context required.", undefined, 403);

  const actor = buildActor(ctx);
  const decision = await can("org:approve_join", actor, { type: "org", id: orgId, ownerId: orgId });
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Cannot decline join request.", undefined, 403);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("advocate_org_join_requests")
    .update({ status: "declined", resolved_at: new Date().toISOString(), resolved_by: ctx.userId })
    .eq("id", requestId)
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) throw new AppError("INTERNAL", "Failed to decline join request.", undefined, 500);
  if (!data) throw new AppError("NOT_FOUND", "Join request not found or already resolved.", undefined, 404);

  void logEvent({
    ctx,
    action: "org.join_request.declined",
    resourceType: "advocate_org_join_request",
    resourceId: requestId,
    organizationId: orgId,
    metadata: {},
    req: req ?? null,
  }).catch(() => {});
}
