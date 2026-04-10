/**
 * Domain 3.1 — GET/POST /api/applicant/bookmarks
 * List or create bookmarks for the authenticated applicant.
 * Thin route — all logic in applicantBookmarkService.
 */

import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { listBookmarks, addBookmark } from "@/lib/server/applicant/applicantBookmarkService";
import type { BookmarkTargetType } from "@/lib/server/applicant/types";

const VALID_TARGET_TYPES: BookmarkTargetType[] = ["provider", "program", "resource"];

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    const supabase = getSupabaseAdmin();
    const bookmarks = await listBookmarks(ctx, supabase);
    return apiOk({ bookmarks });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("applicant.bookmarks.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request.", undefined, 422);
    }

    const { targetType, targetId, notes } = body as Record<string, unknown>;

    if (!targetType || !VALID_TARGET_TYPES.includes(targetType as BookmarkTargetType)) {
      return apiFail("VALIDATION_ERROR", `targetType must be one of: ${VALID_TARGET_TYPES.join(", ")}`, undefined, 422);
    }
    if (!targetId || typeof targetId !== "string") {
      return apiFail("VALIDATION_ERROR", "targetId is required and must be a string.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const bookmark = await addBookmark(
      ctx,
      targetType as BookmarkTargetType,
      targetId,
      typeof notes === "string" ? notes : null,
      supabase,
    );
    return apiOk({ bookmark }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("applicant.bookmarks.post.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
