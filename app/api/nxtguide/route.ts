/**
 * POST /api/nxtguide — Legacy NxtGuide chatbot endpoint.
 *
 * Thin handler: auth → policy check → delegate to nxtguideService.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { requireAcceptedPolicies } from "@/lib/server/policies";
import { toAppError } from "@/lib/server/api";
import {
  processNxtguideMessage,
  type ChatMessage,
  type IntakeStep,
} from "@/lib/server/aiGuidance/nxtguideService";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    await requireAcceptedPolicies({
      ctx,
      requiredDocs: [{ docType: "ai_disclaimer", workflowKey: "ai_chat" }],
      req,
    });

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "We couldn't read that request." }, { status: 400 });
    }

    const messages = (body.messages || []) as ChatMessage[];
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const result = await processNxtguideMessage(ctx, {
      messages,
      currentRoute: (body.currentRoute || "/") as string,
      currentStep: (body.currentStep || null) as IntakeStep | null,
      application: body.application,
      caseId: body.caseId || null,
    });

    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "CONSENT_REQUIRED") {
      return NextResponse.json(
        { ok: false, error: { code: appErr.code, message: appErr.message, details: appErr.details } },
        { status: 403 },
      );
    }
    console.error("[NxtGuide] Error:", err);
    return NextResponse.json({ error: "Failed to contact NxtGuide" }, { status: 500 });
  }
}
