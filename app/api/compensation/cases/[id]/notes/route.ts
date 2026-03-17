/**
 * Phase 7: Internal case notes – list and create. Victims cannot access.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import {
  listCaseNotes,
  createCaseNote,
  getCaseById,
  appendCaseTimelineEvent,
} from "@/lib/server/data";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id: caseId } = await context.params;
    if (!caseId) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "Missing case id" } },
        { status: 400 }
      );
    }

    const notes = await listCaseNotes({ caseId, ctx });

    logEvent({
      ctx,
      action: "case.notes_viewed",
      resourceType: "case",
      resourceId: caseId,
      metadata: { case_id: caseId },
      req,
    }).catch(() => {});

    return apiOk({ notes });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("cases.notes.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id: caseId } = await context.params;
    if (!caseId) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "Missing case id" } },
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

    const note = await createCaseNote({ caseId, ctx, content: content.trim() });

    const result = await getCaseById({ caseId, ctx });
    const caseRow = result?.case as { organization_id: string } | undefined;
    if (caseRow) {
      appendCaseTimelineEvent({
        caseId,
        organizationId: caseRow.organization_id,
        actor: { userId: ctx.userId, role: ctx.orgRole ?? ctx.role },
        eventType: "case.note_added",
        title: "Internal note added",
        description: null,
        metadata: { note_id: note.id },
      }).catch(() => {});
    }

    logEvent({
      ctx,
      action: "case.note_created",
      resourceType: "case",
      resourceId: caseId,
      metadata: { case_id: caseId, note_id: note.id },
      req,
    }).catch(() => {});

    return apiOk({ note }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("cases.notes.post.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
