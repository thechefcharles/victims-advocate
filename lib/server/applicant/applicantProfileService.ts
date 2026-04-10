/**
 * Domain 3.1 — Applicant Domain: profile service layer.
 *
 * Policy-gated business logic. All public functions call can() before
 * delegating to repositories. Routes must call this service only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import type { AuthContext } from "@/lib/server/auth/context";
import {
  resolveApplicantByUserId,
  upsertApplicantProfile,
  computeProfileCompletionPct,
} from "./applicantProfileRepository";
import { getApplicantPreferences, upsertApplicantPreferences } from "./applicantPreferenceRepository";
import { getSafetyPreference, upsertSafetyPreference } from "./safetyPreferenceService";
import { listApplicantBookmarks } from "./applicantBookmarkRepository";
import {
  serializeApplicantSelfView,
  serializeApplicantProviderView,
  serializeApplicantAdminView,
} from "./applicantSerializers";
import type {
  ApplicantProfileRecord,
  ApplicantPreferenceRecord,
  ApplicantSelfView,
  ApplicantProviderView,
  ApplicantAdminView,
} from "./types";

function denyForbidden(message?: string): never {
  throw new AppError("FORBIDDEN", message ?? "Access denied.");
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function getApplicantProfile(
  ctx: AuthContext,
  targetUserId: string,
  supabase: SupabaseClient,
): Promise<ApplicantSelfView | ApplicantProviderView | ApplicantAdminView> {
  const actor = buildActor(ctx);

  if (actor.accountType === "platform_admin") {
    const decision = await can("applicant_profile:view_others", actor, {
      type: "applicant_profile",
      id: targetUserId,
      ownerId: targetUserId,
    });
    if (!decision.allowed) denyForbidden(decision.message);

    const profile = await resolveApplicantByUserId(targetUserId, supabase);
    const preferences = await getApplicantPreferences(targetUserId, supabase);
    const safetyPref = await getSafetyPreference(targetUserId);
    const bookmarks = await listApplicantBookmarks(targetUserId, supabase);
    return serializeApplicantAdminView(profile, preferences, safetyPref, bookmarks);
  }

  if (actor.accountType === "provider") {
    const { canReadVictimPersonalInfo } = await import(
      "@/lib/server/profile/applicantPersonalAccess"
    );
    const hasCaseAccess = canReadVictimPersonalInfo(ctx, targetUserId);
    const decision = await can(
      "applicant_profile:view_others",
      actor,
      { type: "applicant_profile", id: targetUserId, ownerId: targetUserId },
      { requestMetadata: { hasCaseAccess } },
    );
    if (!decision.allowed) denyForbidden(decision.message);

    const profile = await resolveApplicantByUserId(targetUserId, supabase);
    return serializeApplicantProviderView(profile);
  }

  // Self view (applicant)
  const decision = await can("applicant_profile:view", actor, {
    type: "applicant_profile",
    id: targetUserId,
    ownerId: targetUserId,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  const profile = await resolveApplicantByUserId(targetUserId, supabase);
  const preferences = await getApplicantPreferences(targetUserId, supabase);
  const safetyPref = await getSafetyPreference(targetUserId);
  const bookmarks = await listApplicantBookmarks(targetUserId, supabase);
  return serializeApplicantSelfView(profile, preferences, safetyPref, bookmarks);
}

export async function updateApplicantProfile(
  ctx: AuthContext,
  targetUserId: string,
  fields: Partial<Omit<ApplicantProfileRecord, "id" | "user_id" | "created_at" | "updated_at">>,
  supabase: SupabaseClient,
): Promise<ApplicantSelfView> {
  const actor = buildActor(ctx);
  const decision = await can("applicant_profile:update", actor, {
    type: "applicant_profile",
    id: targetUserId,
    ownerId: targetUserId,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  const fieldsWithCompletion = {
    ...fields,
    profile_completion_pct: computeProfileCompletionPct({ user_id: targetUserId, ...fields }),
  };

  await upsertApplicantProfile(targetUserId, fieldsWithCompletion, supabase);

  const profile = await resolveApplicantByUserId(targetUserId, supabase);
  const preferences = await getApplicantPreferences(targetUserId, supabase);
  const safetyPref = await getSafetyPreference(targetUserId);
  const bookmarks = await listApplicantBookmarks(targetUserId, supabase);
  return serializeApplicantSelfView(profile, preferences, safetyPref, bookmarks);
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export async function getApplicantPreferencesForSelf(
  ctx: AuthContext,
  supabase: SupabaseClient,
): Promise<ApplicantPreferenceRecord | null> {
  const actor = buildActor(ctx);
  const decision = await can("applicant_preference:view", actor, {
    type: "applicant_preference",
    id: ctx.userId,
    ownerId: ctx.userId,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  return getApplicantPreferences(ctx.userId, supabase);
}

export async function updateApplicantPreferences(
  ctx: AuthContext,
  fields: Partial<Omit<ApplicantPreferenceRecord, "id" | "user_id" | "created_at" | "updated_at">>,
  supabase: SupabaseClient,
): Promise<ApplicantPreferenceRecord> {
  const actor = buildActor(ctx);
  const decision = await can("applicant_preference:update", actor, {
    type: "applicant_preference",
    id: ctx.userId,
    ownerId: ctx.userId,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  return upsertApplicantPreferences(ctx.userId, fields, supabase);
}

// ---------------------------------------------------------------------------
// Safety Preference
// ---------------------------------------------------------------------------

export async function getSafetyPreferenceForSelf(
  ctx: AuthContext,
): Promise<import("@/lib/server/safety/types").SafetySettings> {
  const actor = buildActor(ctx);
  const decision = await can("safety_preference:view", actor, {
    type: "safety_preference",
    id: ctx.userId,
    ownerId: ctx.userId,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  return getSafetyPreference(ctx.userId);
}

export async function updateSafetyPreference(
  ctx: AuthContext,
  patch: Partial<Omit<import("@/lib/server/safety/types").SafetySettings, "user_id">>,
): Promise<import("@/lib/server/safety/types").SafetySettings> {
  const actor = buildActor(ctx);
  const decision = await can("safety_preference:update", actor, {
    type: "safety_preference",
    id: ctx.userId,
    ownerId: ctx.userId,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  return upsertSafetyPreference(ctx.userId, patch);
}

export async function performQuickExit(
  ctx: AuthContext,
): Promise<{ redirectTo: string }> {
  const actor = buildActor(ctx);
  const decision = await can("safety_preference:quick_exit", actor, {
    type: "safety_preference",
    id: ctx.userId,
    ownerId: ctx.userId,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  return { redirectTo: "/" };
}
