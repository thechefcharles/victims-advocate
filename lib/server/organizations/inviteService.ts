/**
 * Domain 3.2 — Org invite service.
 * Extracted from app/api/org/invites/* route handlers.
 * All auth decisions go through can() per Rule 17.
 */

import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import type { AuthContext } from "@/lib/server/auth";
import { sha256Hex } from "@/lib/server/audit/hash";
import { syncOrganizationLifecycleFromOwnership } from "@/lib/server/organizations/state";
import {
  serializeMemberView,
  serializeInviteView,
  type MemberView,
  type InviteView,
  type OrgInviteRow,
  type OrgMembershipRow,
} from "./memberSerializers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hashToken(token: string): Promise<string> {
  return sha256Hex(token);
}

// ---------------------------------------------------------------------------
// createOrgInvite
// ---------------------------------------------------------------------------

export async function createOrgInvite(
  params: {
    email: string;
    orgRole: string;
    expiryDays?: number;
  },
  ctx: AuthContext,
): Promise<{ invite: InviteView; rawToken: string }> {
  const orgId = ctx.orgId;
  if (!orgId) throw new AppError("FORBIDDEN", "Organization context required.", undefined, 403);

  const actor = buildActor(ctx);
  const decision = await can("org:invite", actor, { type: "org", id: orgId, ownerId: orgId });
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Cannot invite members.", undefined, 403);
  }

  const expiryDays = Math.min(params.expiryDays ?? 7, 30);
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = await hashToken(rawToken);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("org_invites")
    .insert({
      organization_id: orgId,
      email: params.email.trim().toLowerCase(),
      org_role: params.orgRole,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: ctx.userId,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to create invite.", undefined, 500);
  }

  return {
    invite: serializeInviteView(data as OrgInviteRow),
    rawToken,
  };
}

// ---------------------------------------------------------------------------
// listOrgInvites
// ---------------------------------------------------------------------------

export async function listOrgInvites(
  orgId: string,
  ctx: AuthContext,
): Promise<InviteView[]> {
  const actor = buildActor(ctx);
  const decision = await can("org:invite", actor, { type: "org", id: orgId, ownerId: orgId });
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Cannot list invites.", undefined, 403);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("org_invites")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw new AppError("INTERNAL", "Failed to list invites.", undefined, 500);
  return (data ?? []).map((row) => serializeInviteView(row as OrgInviteRow));
}

// ---------------------------------------------------------------------------
// acceptOrgInvite
// ---------------------------------------------------------------------------

export async function acceptOrgInvite(token: string, ctx: AuthContext): Promise<MemberView> {
  const tokenHash = await hashToken(token);
  const supabase = getSupabaseAdmin();

  const { data: invite, error: inviteErr } = await supabase
    .from("org_invites")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (inviteErr || !invite) {
    throw new AppError("NOT_FOUND", "Invite not found or invalid.", undefined, 404);
  }

  const row = invite as OrgInviteRow;

  if (row.used_at) {
    throw new AppError("CONFLICT", "This invite has already been used.", undefined, 409);
  }
  if (row.revoked_at) {
    throw new AppError("CONFLICT", "This invite has been revoked.", undefined, 409);
  }
  if (new Date(row.expires_at) < new Date()) {
    throw new AppError("CONFLICT", "This invite has expired.", undefined, 409);
  }

  // Email must match the invited address
  const userEmail = ctx.user?.email ?? "";
  if (userEmail.toLowerCase() !== row.email.toLowerCase()) {
    throw new AppError("FORBIDDEN", "This invite was sent to a different email address.", undefined, 403);
  }

  // Check user does not already have an active membership (unique constraint on user_id)
  const { data: existing } = await supabase
    .from("org_memberships")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    throw new AppError("CONFLICT", "You are already a member of an organization.", undefined, 409);
  }

  // Insert membership
  const { data: membership, error: memberErr } = await supabase
    .from("org_memberships")
    .insert({
      user_id: ctx.userId,
      organization_id: row.organization_id,
      org_role: row.org_role,
      status: "active",
      created_by: ctx.userId,
    })
    .select("*")
    .single();

  if (memberErr || !membership) {
    throw new AppError("INTERNAL", "Failed to create membership.", undefined, 500);
  }

  // Sync org lifecycle (non-blocking) — arg order: (supabase, organizationId)
  syncOrganizationLifecycleFromOwnership(supabase, row.organization_id).catch((err) => {
    console.error("[inviteService] syncOrgLifecycle failed", { orgId: row.organization_id, err });
  });

  // Mark invite as used
  await supabase
    .from("org_invites")
    .update({ used_at: new Date().toISOString(), used_by: ctx.userId })
    .eq("id", row.id);

  return serializeMemberView(membership as OrgMembershipRow);
}

// ---------------------------------------------------------------------------
// revokeOrgInvite
// ---------------------------------------------------------------------------

export async function revokeOrgInvite(inviteId: string, ctx: AuthContext): Promise<void> {
  const orgId = ctx.orgId;
  if (!orgId) throw new AppError("FORBIDDEN", "Organization context required.", undefined, 403);

  const actor = buildActor(ctx);
  const decision = await can("org:revoke_invite", actor, { type: "org", id: orgId, ownerId: orgId });
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Cannot revoke invite.", undefined, 403);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("org_invites")
    .update({ revoked_at: new Date().toISOString(), revoked_by: ctx.userId })
    .eq("id", inviteId)
    .eq("organization_id", orgId) // cross-org guard
    .select("id")
    .maybeSingle();

  if (error) throw new AppError("INTERNAL", "Failed to revoke invite.", undefined, 500);
  if (!data) throw new AppError("NOT_FOUND", "Invite not found.", undefined, 404);
}
