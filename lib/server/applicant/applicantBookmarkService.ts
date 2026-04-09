/**
 * Domain 3.1 — Applicant Domain: bookmark service layer.
 *
 * Policy-gated. All public functions call can() before delegating to the repository.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import type { AuthContext } from "@/lib/server/auth/context";
import {
  listApplicantBookmarks,
  createApplicantBookmark,
  deleteApplicantBookmark,
  reorderApplicantBookmarks,
} from "./applicantBookmarkRepository";
import type { ApplicantBookmarkRecord, BookmarkTargetType } from "./types";

function denyForbidden(message?: string): never {
  throw new AppError("FORBIDDEN", message ?? "Access denied.");
}

export async function listBookmarks(
  ctx: AuthContext,
  supabase: SupabaseClient,
): Promise<ApplicantBookmarkRecord[]> {
  const actor = buildActor(ctx);
  const decision = await can("applicant_bookmark:list", actor, {
    type: "applicant_bookmark",
    id: null,
    ownerId: ctx.userId,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  return listApplicantBookmarks(ctx.userId, supabase);
}

export async function addBookmark(
  ctx: AuthContext,
  targetType: BookmarkTargetType,
  targetId: string,
  notes: string | null,
  supabase: SupabaseClient,
): Promise<ApplicantBookmarkRecord> {
  const actor = buildActor(ctx);
  const decision = await can("applicant_bookmark:create", actor, {
    type: "applicant_bookmark",
    id: null,
    ownerId: ctx.userId,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  return createApplicantBookmark(ctx.userId, targetType, targetId, notes, supabase);
}

export async function removeBookmark(
  ctx: AuthContext,
  bookmarkId: string,
  supabase: SupabaseClient,
): Promise<void> {
  const actor = buildActor(ctx);
  const decision = await can("applicant_bookmark:delete", actor, {
    type: "applicant_bookmark",
    id: bookmarkId,
    ownerId: ctx.userId,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  return deleteApplicantBookmark(bookmarkId, ctx.userId, supabase);
}

export async function reorderBookmarks(
  ctx: AuthContext,
  orderedIds: string[],
  supabase: SupabaseClient,
): Promise<void> {
  const actor = buildActor(ctx);
  const decision = await can("applicant_bookmark:reorder", actor, {
    type: "applicant_bookmark",
    id: null,
    ownerId: ctx.userId,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  return reorderApplicantBookmarks(ctx.userId, orderedIds, supabase);
}
