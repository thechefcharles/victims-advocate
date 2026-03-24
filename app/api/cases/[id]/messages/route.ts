import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { getCaseById } from "@/lib/server/data";
import type { CaseRowLike } from "@/lib/server/auth/orgCaseAccess";
import { assertCaseMessagingAllowed } from "@/lib/server/messaging/permissions";
import { getOrCreateConversationForCase } from "@/lib/server/messaging/conversations";
import { listMessages, sendMessage } from "@/lib/server/messaging/messages";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id: caseId } = await context.params;
    const caseResult = await getCaseById({ caseId, ctx, req });
    if (!caseResult) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    await assertCaseMessagingAllowed({
      ctx,
      caseRow: caseResult.case as CaseRowLike,
      mode: "view",
      req,
    });

    const conversation = await getOrCreateConversationForCase({ caseId, ctx });
    const messages = await listMessages({ conversationId: conversation.id, ctx });

    // unread_count: messages not read by current user, and not sent by current user
    const supabase = getSupabaseAdmin();
    const messageIds = messages.map((m) => m.id);
    let readSet = new Set<string>();
    if (messageIds.length > 0) {
      const { data: reads } = await supabase
        .from("message_reads")
        .select("message_id")
        .in("message_id", messageIds)
        .eq("user_id", ctx.userId);
      readSet = new Set((reads ?? []).map((r: any) => r.message_id as string));
    }
    const unread_count = messages.filter(
      (m) => m.sender_user_id !== ctx.userId && !readSet.has(m.id)
    ).length;

    await logEvent({
      ctx,
      action: "message.thread_viewed",
      resourceType: "case",
      resourceId: caseId,
      organizationId: conversation.organization_id,
      metadata: { conversationId: conversation.id },
    });

    return NextResponse.json({ conversation, messages, unread_count });
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
    const caseResult = await getCaseById({ caseId, ctx, req });
    if (!caseResult) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const message_text = (body?.message_text ?? "").toString();

    const conversation = await getOrCreateConversationForCase({ caseId, ctx });
    const message = await sendMessage({ conversation, ctx, message_text, req });

    return NextResponse.json({ conversation, message });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("case.messages.post.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

