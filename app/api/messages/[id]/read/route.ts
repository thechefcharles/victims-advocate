import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { markMessageRead } from "@/lib/server/messaging/messages";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    await markMessageRead({ messageId: id, ctx });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("message.read.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

