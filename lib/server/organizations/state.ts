/**
 * Phase 1 organization state: lifecycle (ownership) vs public visibility.
 * Operational row status remains `organizations.status` (active/suspended/archived).
 *
 * @see supabase/migrations/20260425120000_org_phase1_lifecycle_state.sql
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { meetsSearchableMinimum } from "@/lib/organizations/profileStage";
import { logger } from "@/lib/server/logging";
import type { OrganizationProfile } from "./types";

export const ORG_LIFECYCLE_STATUSES = ["seeded", "managed", "archived"] as const;
export type OrgLifecycleStatus = (typeof ORG_LIFECYCLE_STATUSES)[number];

export const ORG_PUBLIC_PROFILE_STATUSES = [
  "draft",
  "pending_review",
  "active",
  "paused",
] as const;
export type OrgPublicProfileStatus = (typeof ORG_PUBLIC_PROFILE_STATUSES)[number];

export const orgLifecycleStatusSchema = z.enum(ORG_LIFECYCLE_STATUSES);
export const orgPublicProfileStatusSchema = z.enum(ORG_PUBLIC_PROFILE_STATUSES);

/** Minimal org shape for Phase 1 helpers (DB row or API projection). */
export type OrganizationStateFields = {
  lifecycle_status?: OrgLifecycleStatus | string | null;
  public_profile_status?: OrgPublicProfileStatus | string | null;
};

export function parseOrgLifecycleStatus(raw: unknown): OrgLifecycleStatus | null {
  const r = orgLifecycleStatusSchema.safeParse(raw);
  return r.success ? r.data : null;
}

export function parseOrgPublicProfileStatus(raw: unknown): OrgPublicProfileStatus | null {
  const r = orgPublicProfileStatusSchema.safeParse(raw);
  return r.success ? r.data : null;
}

/** True when the org has confirmed ownership (lifecycle managed). */
export function isOrganizationManaged(org: OrganizationStateFields): boolean {
  return org.lifecycle_status === "managed";
}

/** True when public/discovery profile is active (Phase 1 field). */
export function isOrganizationPublic(org: OrganizationStateFields): boolean {
  return org.public_profile_status === "active";
}

/**
 * Intended for discovery/matching once Phase 6+ applies these gates.
 * Today matching still uses profile_status/profile_stage — do not use this for filtering yet.
 */
export function canOrganizationAppearInSearch(org: OrganizationStateFields): boolean {
  return isOrganizationManaged(org) && isOrganizationPublic(org);
}

export type ActivationSubmitEligibility =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Phase 3: whether an org leader may submit for public activation review.
 * Caller must still enforce org_owner (or platform admin) separately.
 */
export function canOrganizationSubmitForActivation(params: {
  lifecycle_status?: string | null;
  public_profile_status?: string | null;
  name: string;
  profile: OrganizationProfile;
}): ActivationSubmitEligibility {
  const orgFields: OrganizationStateFields = {
    lifecycle_status: params.lifecycle_status,
    public_profile_status: params.public_profile_status,
  };

  if (!isOrganizationManaged(orgFields)) {
    return {
      ok: false,
      reason:
        "Organization ownership must be confirmed before you can request public activation.",
    };
  }

  const pub = parseOrgPublicProfileStatus(params.public_profile_status);
  if (pub === "pending_review") {
    return { ok: false, reason: "A review request is already in progress." };
  }
  if (pub === "active") {
    return { ok: false, reason: "Your organization is already publicly active." };
  }
  if (pub !== "draft" && pub !== "paused") {
    return { ok: false, reason: "Cannot submit for review in the current state." };
  }

  if (!params.name.trim()) {
    return { ok: false, reason: "Organization name is required." };
  }

  if (!meetsSearchableMinimum(params.profile)) {
    return {
      ok: false,
      reason:
        "Add services, languages, coverage area, and capacity before submitting for review.",
    };
  }

  return { ok: true };
}

/**
 * Sets lifecycle_status to `managed` when the org has at least one active org_owner.
 * Skips when lifecycle is already `archived`. Does not demote to seeded when owners are removed (Phase 1).
 */
export async function syncOrganizationLifecycleFromOwnership(
  supabase: SupabaseClient,
  organizationId: string
): Promise<void> {
  const { data: orgRow, error: orgErr } = await supabase
    .from("organizations")
    .select("lifecycle_status")
    .eq("id", organizationId)
    .maybeSingle();

  if (orgErr) {
    logger.warn("org.lifecycle.sync.fetch_failed", {
      message: orgErr.message,
      organizationId,
    });
    return;
  }
  const life = orgRow?.lifecycle_status as string | undefined;
  if (life === "archived") return;

  const { count, error: cntErr } = await supabase
    .from("org_memberships")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .eq("org_role", "org_owner");

  if (cntErr) {
    logger.warn("org.lifecycle.sync.count_failed", {
      message: cntErr.message,
      organizationId,
    });
    return;
  }

  if ((count ?? 0) < 1) return;

  const { error: upErr } = await supabase
    .from("organizations")
    .update({ lifecycle_status: "managed" })
    .eq("id", organizationId)
    .neq("lifecycle_status", "archived");

  if (upErr) {
    logger.warn("org.lifecycle.sync.update_failed", {
      message: upErr.message,
      organizationId,
    });
  }
}
