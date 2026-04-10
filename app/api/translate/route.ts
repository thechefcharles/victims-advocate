/**
 * Domain 2.4: Translation / i18n — legacy translate route (now a thin shell).
 *
 * Replaced by Domain 2.4. Business logic lives in
 * lib/server/translation/explanationService.ts. URL and HTTP method preserved
 * so existing callers (the intake page's "Explain this" button) continue to work.
 *
 * NOTE: This file was previously 395 lines containing direct OpenAI calls,
 * KB grounding orchestration, hashing, and audit logging. All of that moved
 * into lib/server/translation/. The compliance posture (BEHAVIOR_RULES,
 * DEFAULT_DISCLAIMER, MAX_EXPLANATION_LENGTH, hash-only logging, KB grounding)
 * is preserved EXACTLY in the new module.
 *
 * Rule 17 violation fixed: this route now calls can() via explanationService
 * before processing the request.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { explainText } from "@/lib/server/translation";
import type {
  ExplainContextType,
  ExplainRequest,
} from "@/lib/server/translation";

export const runtime = "nodejs";

type ExplainBody = {
  sourceText?: string;
  contextType?: ExplainContextType | string;
  workflowKey?: string;
  fieldKey?: string | null;
  programKey?: string | null;
  stateCode?: string | null;
  userRole?: string | null;
};

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = (await req.json().catch(() => null)) as ExplainBody | null;
    if (!body || typeof body.sourceText !== "string" || body.sourceText.trim().length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "sourceText is required.",
        undefined,
        422,
      );
    }

    const request: ExplainRequest = {
      sourceText: body.sourceText,
      contextType: (body.contextType as ExplainContextType) ?? "general",
      workflowKey: body.workflowKey ?? "translator",
      fieldKey: body.fieldKey ?? null,
      programKey: body.programKey ?? null,
      stateCode: body.stateCode ?? null,
      userRole: body.userRole ?? ctx.role ?? null,
    };

    const supabase = getSupabaseAdmin();
    const result = await explainText(ctx, request, supabase);

    return NextResponse.json({
      ok: true,
      data: {
        explanation: result.explanation,
        disclaimer: result.disclaimer,
      },
    });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
