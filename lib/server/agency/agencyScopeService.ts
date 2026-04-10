/**
 * Domain 6.2 — Agency scope service.
 *
 * Centralizes all scope-resolution logic. Every agency query MUST go
 * through resolveAgencyScope() to determine which org IDs the actor's
 * agency can see. No route handler should build its own scope query.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";
import { getAgencyMembershipForUser, getOversightOrgIds } from "./agencyRepository";

export interface AgencyScope {
  agencyId: string;
  inScopeOrgIds: string[];
}

/**
 * Resolves the agency scope for the given actor. Returns the agency ID
 * and the list of organization IDs the actor's agency oversees.
 *
 * Returns null if the actor has no active agency membership.
 */
export async function resolveAgencyScope(
  actor: PolicyActor,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<AgencyScope | null> {
  if (actor.accountType !== "agency") return null;

  const membership = await getAgencyMembershipForUser(actor.userId, supabase);
  if (!membership) return null;

  const inScopeOrgIds = await getOversightOrgIds(membership.agencyId, supabase);
  return {
    agencyId: membership.agencyId,
    inScopeOrgIds,
  };
}

/**
 * Checks whether a specific organization is within the actor's agency scope.
 */
export async function isOrgInScope(
  actor: PolicyActor,
  organizationId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<boolean> {
  const scope = await resolveAgencyScope(actor, supabase);
  if (!scope) return false;
  return scope.inScopeOrgIds.includes(organizationId);
}
