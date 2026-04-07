/**
 * Domain 1.3 — GET/POST /api/cases/[id]/messages
 *
 * GET  — list messages (cursor pagination). Returns { data, thread, canSendMessage, unread_count, meta }.
 * POST — send a message. Returns { data: message, thread }.
 *
 * Auth via can() — no inline role checks. All permission decisions in policyEngine.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { can } from "@/lib/server/policy/policyEngine";
import { getCaseRecordById } from "@/lib/server/cases/caseRepository";
import { getOrCreateCaseThread } from "@/lib/server/messaging/threadService";
import { deriveThreadStatusFromCaseStatus } from "@/lib/server/messaging/threadStateMachine";
import { sendMessage, listMessages } from "@/lib/server/messaging/messageService";
import {
  serializeThreadForApplicant,
  serializeThreadForProvider,
  serializeThreadForAdmin,
} from "@/lib/server/messaging/threadSerializer";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id: caseId } = await context.params;
    const supabase = getSupabaseAdmin();

    const caseRecord = await getCaseRecordById(supabase, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const actor = buildActor(ctx);
    const effectiveThreadStatus = deriveThreadStatusFromCaseStatus(caseRecord.status);

    const resource = {
      type: "message" as const,
      id: caseId,
      ownerId: caseRecord.owner_user_id,
      tenantId: caseRecord.organization_id,
      status: effectiveThreadStatus,
      assignedTo: caseRecord.assigned_advocate_id,
    };

    // Lazy-create thread if allowed
    if (!caseRecord.organization_id) {
      return NextResponse.json(
        { error: "Case is not connected to an organization." },
        { status: 422 },
      );
    }

    const thread = await getOrCreateCaseThread({
      caseId,
      orgId: caseRecord.organization_id,
      userId: ctx.userId,
      supabase,
    });

    // Cursor pagination
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const limitParam = parseInt(url.searchParams.get("limit") ?? "50", 10);

    const page = await listMessages({
      actor,
      resource,
      conversationId: thread.id,
      cursor,
      limit: limitParam,
      supabase,
    });

    // Determine canSendMessage
    const sendResource = { ...resource, status: effectiveThreadStatus };
    const sendDecision = await can("message:send", actor, sendResource);
    const canSendMessage = sendDecision.allowed;

    // Unread count: messages not sent by current user and not yet read
    const messageIds = page.data.map((m) => m.id);
    let unreadCount = 0;
    if (messageIds.length > 0) {
      const { data: reads } = await supabase
        .from("message_reads")
        .select("message_id")
        .in("message_id", messageIds)
        .eq("user_id", ctx.userId);
      const readSet = new Set((reads ?? []).map((r: { message_id: string }) => r.message_id));
      unreadCount = page.data.filter(
        (m) => m.sender_user_id !== ctx.userId && !readSet.has(m.id),
      ).length;
    }

    // Serialize thread by account type
    const threadView = ctx.isAdmin
      ? serializeThreadForAdmin(thread, canSendMessage)
      : ctx.accountType === "provider"
        ? serializeThreadForProvider(thread, canSendMessage)
        : serializeThreadForApplicant(thread, canSendMessage);

    return NextResponse.json({
      data: page.data,
      thread: threadView,
      canSendMessage,
      unread_count: unreadCount,
      meta: page.meta,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("case.messages.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id: caseId } = await context.params;
    const supabase = getSupabaseAdmin();

    const caseRecord = await getCaseRecordById(supabase, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (!caseRecord.organization_id) {
      return NextResponse.json(
        { error: "Case is not connected to an organization." },
        { status: 422 },
      );
    }

    const actor = buildActor(ctx);
    const effectiveThreadStatus = deriveThreadStatusFromCaseStatus(caseRecord.status);

    const resource = {
      type: "message" as const,
      id: caseId,
      ownerId: caseRecord.owner_user_id,
      tenantId: caseRecord.organization_id,
      status: effectiveThreadStatus,
      assignedTo: caseRecord.assigned_advocate_id,
    };

    const thread = await getOrCreateCaseThread({
      caseId,
      orgId: caseRecord.organization_id,
      userId: ctx.userId,
      supabase,
    });

    const body = await req.json().catch(() => ({}));
    const messageText = (body?.message_text ?? "").toString();

    const result = await sendMessage({
      actor,
      resource,
      conversation: thread,
      messageText,
      supabase,
      legacyCtx: {
        userId: ctx.userId,
        role: ctx.role,
        isAdmin: ctx.isAdmin,
        orgId: ctx.orgId,
      },
    });

    const threadView = ctx.isAdmin
      ? serializeThreadForAdmin(thread, true)
      : ctx.accountType === "provider"
        ? serializeThreadForProvider(thread, true)
        : serializeThreadForApplicant(thread, true);

    return NextResponse.json({ data: result.data, thread: threadView });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("case.messages.post.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
