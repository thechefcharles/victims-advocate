/**
 * Phase 7: Soft-delete internal case note.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { deleteCaseNote } from "@/lib/server/data";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id: noteId } = await context.params;
    if (!noteId) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "Missing note id" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: note } = await supabase
      .from("case_notes")
      .select("case_id")
      .eq("id", noteId)
      .maybeSingle();

    await deleteCaseNote({ noteId, ctx });

    if (note?.case_id) {
      logEvent({
        ctx,
        action: "case.note_deleted",
        resourceType: "case",
        resourceId: note.case_id,
        metadata: { case_id: note.case_id, note_id: noteId },
        req,
      }).catch(() => {});
    }

    return apiOk({ deleted: true, note_id: noteId });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("case-notes.delete.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
