/**
 * Domain 3.1 — Applicant Domain: trusted helper service layer.
 *
 * Policy-gated. All public functions call can() before delegating to the repository.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import type { AuthContext } from "@/lib/server/auth/context";
import {
  grantTrustedHelperAccess,
  revokeTrustedHelperAccess,
  listHelperGrantsForApplicant,
  listGrantsForHelper,
  resolveActiveGrant,
} from "./trustedHelperRepository";
import type { TrustedHelperAccessRecord } from "./types";

export type SyntheticHelperContext = {
  userId: string;
  actingAs: string;
  grantedScope: string[];
};

function denyForbidden(message?: string): never {
  throw new AppError("FORBIDDEN", message ?? "Access denied.");
}

export async function grantHelper(
  ctx: AuthContext,
  helperUserId: string,
  scope: string[],
  notes: string | null,
  supabase: SupabaseClient,
): Promise<TrustedHelperAccessRecord> {
  const actor = buildActor(ctx);
  const decision = await can("trusted_helper:grant", actor, {
    type: "trusted_helper_access",
    id: null,
    ownerId: ctx.userId,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  return grantTrustedHelperAccess(ctx.userId, helperUserId, scope, ctx.userId, notes, supabase);
}

export async function revokeHelper(
  ctx: AuthContext,
  grantId: string,
  supabase: SupabaseClient,
): Promise<TrustedHelperAccessRecord> {
  const actor = buildActor(ctx);
  const decision = await can("trusted_helper:revoke", actor, {
    type: "trusted_helper_access",
    id: grantId,
    ownerId: ctx.userId,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  return revokeTrustedHelperAccess(grantId, ctx.userId, supabase);
}

export async function listMyHelpers(
  ctx: AuthContext,
  supabase: SupabaseClient,
): Promise<TrustedHelperAccessRecord[]> {
  const actor = buildActor(ctx);
  const decision = await can("trusted_helper:list", actor, {
    type: "trusted_helper_access",
    id: null,
    ownerId: ctx.userId,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  return listHelperGrantsForApplicant(ctx.userId, supabase);
}

export async function listMyGrantors(
  ctx: AuthContext,
  supabase: SupabaseClient,
): Promise<TrustedHelperAccessRecord[]> {
  // No special policy gate beyond authentication — helpers can see their own grants
  if (!ctx.userId) throw new AppError("FORBIDDEN", "Authentication required.");
  return listGrantsForHelper(ctx.userId, supabase);
}

export async function actAsApplicant(
  ctx: AuthContext,
  applicantUserId: string,
  requestedAction: string,
  supabase: SupabaseClient,
): Promise<{ syntheticContext: SyntheticHelperContext }> {
  const actor = buildActor(ctx);

  // Pre-fetch the grant to inject via context
  const grant = await resolveActiveGrant(applicantUserId, ctx.userId, supabase);

  const decision = await can(
    "trusted_helper:act_as",
    actor,
    {
      type: "trusted_helper_access",
      id: null,
      ownerId: applicantUserId,
      status: requestedAction,
    },
    { requestMetadata: { helperGrant: grant } },
  );
  if (!decision.allowed) denyForbidden(decision.message);

  return {
    syntheticContext: {
      userId: applicantUserId,
      actingAs: ctx.userId,
      grantedScope: grant?.granted_scope ?? [],
    },
  };
}
