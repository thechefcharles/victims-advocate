/**
 * Phase 7: Edit internal case note.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import {
  editCaseNote,
  getCaseById,
  appendCaseTimelineEvent,
} from "@/lib/server/data";
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

    const body = await req.json().catch(() => null);
    const content = body?.content;
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "content is required" } },
        { status: 422 }
      );
    }

    const note = await editCaseNote({ noteId, ctx, content: content.trim() });

    const result = await getCaseById({ caseId: note.case_id, ctx });
    const caseRow = result?.case as { organization_id: string } | undefined;
    if (caseRow) {
      appendCaseTimelineEvent({
        caseId: note.case_id,
        organizationId: note.organization_id,
        actor: { userId: ctx.userId, role: ctx.orgRole ?? ctx.role },
        eventType: "case.note_edited",
        title: "Internal note edited",
        description: null,
        metadata: { note_id: note.id },
      }).catch(() => {});
    }

    logEvent({
      ctx,
      action: "case.note_edited",
      resourceType: "case",
      resourceId: note.case_id,
      metadata: { case_id: note.case_id, note_id: note.id },
      req,
    }).catch(() => {});

    return apiOk({ note });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("case-notes.edit.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
