/**
 * Domain 3.1 — Applicant Domain: bookmark data access layer.
 *
 * Pure data access — no policy checks.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import type { ApplicantBookmarkRecord, BookmarkTargetType } from "./types";

export async function listApplicantBookmarks(
  applicantUserId: string,
  supabase: SupabaseClient,
): Promise<ApplicantBookmarkRecord[]> {
  const { data, error } = await supabase
    .from("applicant_bookmarks")
    .select("*")
    .eq("applicant_user_id", applicantUserId)
    .order("position", { ascending: true });

  if (error) {
    throw new AppError("INTERNAL", `Failed to list bookmarks: ${error.message}`);
  }

  return (data ?? []) as ApplicantBookmarkRecord[];
}

export async function insertApplicantBookmark(
  applicantUserId: string,
  targetType: BookmarkTargetType,
  targetId: string,
  notes: string | null,
  supabase: SupabaseClient,
): Promise<ApplicantBookmarkRecord> {
  // Check for duplicate first — return existing on conflict
  const { data: existing } = await supabase
    .from("applicant_bookmarks")
    .select("*")
    .eq("applicant_user_id", applicantUserId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  if (existing) {
    return existing as ApplicantBookmarkRecord;
  }

  // Compute next position
  const { data: maxRow } = await supabase
    .from("applicant_bookmarks")
    .select("position")
    .eq("applicant_user_id", applicantUserId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = maxRow ? (maxRow as { position: number }).position + 1 : 0;

  const { data, error } = await supabase
    .from("applicant_bookmarks")
    .insert({
      applicant_user_id: applicantUserId,
      target_type: targetType,
      target_id: targetId,
      notes,
      position: nextPosition,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError("INTERNAL", `Failed to create bookmark: ${error?.message ?? "no data"}`);
  }

  return data as ApplicantBookmarkRecord;
}

export async function deleteApplicantBookmark(
  bookmarkId: string,
  applicantUserId: string,
  supabase: SupabaseClient,
): Promise<void> {
  // Verify ownership
  const { data: row } = await supabase
    .from("applicant_bookmarks")
    .select("applicant_user_id")
    .eq("id", bookmarkId)
    .maybeSingle();

  if (!row) {
    throw new AppError("NOT_FOUND", "Bookmark not found.");
  }

  if ((row as { applicant_user_id: string }).applicant_user_id !== applicantUserId) {
    throw new AppError("FORBIDDEN", "You do not own this bookmark.");
  }

  const { error } = await supabase
    .from("applicant_bookmarks")
    .delete()
    .eq("id", bookmarkId);

  if (error) {
    throw new AppError("INTERNAL", `Failed to delete bookmark: ${error.message}`);
  }
}

export async function reorderApplicantBookmarks(
  applicantUserId: string,
  orderedIds: string[],
  supabase: SupabaseClient,
): Promise<void> {
  if (orderedIds.length === 0) return;

  // Validate all IDs belong to this applicant
  const { data: owned, error: fetchErr } = await supabase
    .from("applicant_bookmarks")
    .select("id")
    .eq("applicant_user_id", applicantUserId)
    .in("id", orderedIds);

  if (fetchErr) {
    throw new AppError("INTERNAL", `Failed to validate bookmarks: ${fetchErr.message}`);
  }

  const ownedIds = new Set((owned ?? []).map((r: { id: string }) => r.id));
  const unowned = orderedIds.filter((id) => !ownedIds.has(id));
  if (unowned.length > 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Bookmarks not owned by this applicant: ${unowned.join(", ")}`,
    );
  }

  // Batch update positions
  const updates = orderedIds.map((id, index) => ({ id, position: index }));
  for (const { id, position } of updates) {
    await supabase
      .from("applicant_bookmarks")
      .update({ position })
      .eq("id", id)
      .eq("applicant_user_id", applicantUserId);
  }
}
