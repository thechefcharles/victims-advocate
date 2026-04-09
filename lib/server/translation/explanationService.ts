/**
 * Domain 2.4: Translation / i18n — explanation ("Explain this") service.
 *
 * Absorbs the business logic from the legacy app/api/translate/route.ts.
 * Compliance code preserved EXACTLY:
 *   - Source text → sha256Hex via hashExplanationSourceText (HASH ONLY)
 *   - BEHAVIOR_RULES system prompt (no legal advice, no eligibility certainty)
 *   - DEFAULT_DISCLAIMER auto-append
 *   - MAX_EXPLANATION_LENGTH truncation
 *   - KB grounding via getKnowledgeForExplain
 *   - OpenAI model env var, temperature, max_tokens unchanged
 *
 * NEW in Domain 2.4:
 *   - can("translation:explain_text") gate (Rule 17 fix)
 *   - Persistent explanation_requests row (status pending → completed/failed)
 *   - applyOutputGuardrails post-processor (defense in depth)
 *
 * HARD RULE: source_text NEVER persisted. The DB row only stores the hash
 * and length. The model OUTPUT is stored because BEHAVIOR_RULES prevent PII
 * in output.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { AuthContext } from "@/lib/server/auth/context";
import { config } from "@/lib/config";
import { getKnowledgeForExplain } from "@/lib/server/knowledge";
import {
  buildExplainSystemPrompt,
  buildExplainUserPrompt,
  buildKnowledgeContextBlock,
} from "./buildPrompt";
import {
  DEFAULT_DISCLAIMER,
  MAX_EXPLANATION_LENGTH,
  type ExplainRequest,
  type ExplainResponse,
  type AdminExplanationLogView,
  type ExplanationRequestRecord,
} from "./translationTypes";
import { hashExplanationSourceText } from "./hashUtils";
import { applyOutputGuardrails } from "./outputGuardrails";
import {
  insertExplanationRequest,
  updateExplanationRequest,
  listExplanationRequests,
} from "./translationRepository";

function denyForbidden(reason?: string): never {
  throw new AppError("FORBIDDEN", reason ?? "Access denied.");
}

// Re-export for callers
export { hashExplanationSourceText };

// ---------------------------------------------------------------------------
// explainText — the main entry point
// ---------------------------------------------------------------------------

export async function explainText(
  ctx: AuthContext,
  request: ExplainRequest,
  supabase: SupabaseClient,
): Promise<ExplainResponse> {
  // 1. Policy gate (Rule 17 — was missing in legacy route)
  const actor = buildActor(ctx);
  const decision = await can("translation:explain_text", actor, {
    type: "explanation_request",
    id: null,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  const sourceText = (request.sourceText ?? "").trim();
  if (!sourceText) {
    throw new AppError("VALIDATION_ERROR", "sourceText is required.");
  }

  // 2. Hash + create persistent request row (status='pending')
  const sourceHash = await hashExplanationSourceText(sourceText);
  const model = process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-4o-mini";

  const requestRow = await insertExplanationRequest(supabase, {
    user_id: ctx.userId ?? null,
    workflow_key: request.workflowKey ?? "translator",
    context_type: request.contextType ?? "general",
    field_key: request.fieldKey ?? null,
    state_code: request.stateCode ?? null,
    source_text_hash: sourceHash,
    source_text_length: sourceText.length,
    model,
  });

  // Audit log (preserved from legacy route — same metadata shape)
  void logEvent({
    ctx,
    action: "translator.requested",
    resourceType: "explanation_request",
    resourceId: requestRow.id,
    metadata: {
      context_type: request.contextType ?? "general",
      workflow_key: request.workflowKey ?? "translator",
      field_key: request.fieldKey ?? null,
      state_code: request.stateCode ?? null,
      program_key: request.programKey ?? null,
      source_text_hash: sourceHash,
      source_text_length: sourceText.length,
    },
  });

  // 3. KB grounding lookup (Phase 10 — preserved)
  const apiKey = config.openaiApiKey;
  if (!apiKey) {
    await markFailed(supabase, requestRow.id, "Missing OPENAI_API_KEY", ctx, sourceHash);
    throw new AppError("INTERNAL", "Missing OPENAI_API_KEY");
  }

  try {
    const kbEntries = await getKnowledgeForExplain({
      stateCode: request.stateCode ?? null,
      programKey: request.programKey ?? null,
      workflowKey: request.workflowKey ?? null,
      fieldKey: request.fieldKey ?? null,
      contextType: request.contextType ?? null,
      limit: 5,
    });
    const hasKb = kbEntries.length > 0;
    const systemPrompt = buildExplainSystemPrompt(hasKb);
    const baseUserPrompt = buildExplainUserPrompt({ ...request, sourceText });
    const userPrompt = hasKb
      ? buildKnowledgeContextBlock(kbEntries) + baseUserPrompt
      : baseUserPrompt;

    // 4. OpenAI call — same params as legacy route
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      await markFailed(supabase, requestRow.id, `openai_error_${res.status}`, ctx, sourceHash);
      throw new AppError("INTERNAL", "Explanation request failed");
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = (data?.choices?.[0]?.message?.content ?? "").trim();
    if (!raw) {
      await markFailed(supabase, requestRow.id, "empty_response", ctx, sourceHash);
      throw new AppError("INTERNAL", "Empty explanation response");
    }

    // 5. Defense-in-depth: blacklist post-processor (NEW in 2.4)
    const guarded = applyOutputGuardrails(raw);
    let explanation = guarded.output;

    // 6. Truncation (preserved from legacy route)
    if (explanation.length > MAX_EXPLANATION_LENGTH) {
      explanation = explanation.slice(0, MAX_EXPLANATION_LENGTH - 3) + "...";
    }

    // 7. Disclaimer auto-append (preserved from legacy route)
    const hasDisclaimer = /legal advice|general information/i.test(explanation);
    const disclaimer = hasDisclaimer ? null : DEFAULT_DISCLAIMER;

    // 8. Persist completion + audit log
    await updateExplanationRequest(supabase, requestRow.id, {
      status: "completed",
      explanation_text: explanation,
      disclaimer,
      completed_at: new Date().toISOString(),
    });

    void logEvent({
      ctx,
      action: "translator.completed",
      resourceType: "explanation_request",
      resourceId: requestRow.id,
      metadata: {
        context_type: request.contextType ?? "general",
        workflow_key: request.workflowKey ?? "translator",
        field_key: request.fieldKey ?? null,
        source_text_hash: sourceHash,
        source_text_length: sourceText.length,
        result_status: "completed",
        guardrail_tripped: !guarded.safe,
        guardrail_phrase: guarded.trippedPhrase ?? null,
      },
    });

    return {
      explanation,
      disclaimer: disclaimer ?? undefined,
    };
  } catch (err) {
    // Outer catch — failures from OpenAI fetch / KB lookup land here
    if (err instanceof AppError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(supabase, requestRow.id, message, ctx, sourceHash);
    throw new AppError("INTERNAL", `Explanation failed: ${message}`);
  }
}

async function markFailed(
  supabase: SupabaseClient,
  requestId: string,
  reason: string,
  ctx: AuthContext,
  sourceHash: string,
): Promise<void> {
  await updateExplanationRequest(supabase, requestId, {
    status: "failed",
    failure_reason: reason,
    completed_at: new Date().toISOString(),
  });
  void logEvent({
    ctx,
    action: "translator.blocked",
    resourceType: "explanation_request",
    resourceId: requestId,
    severity: "warning",
    metadata: {
      source_text_hash: sourceHash,
      result_status: reason,
    },
  });
}

// ---------------------------------------------------------------------------
// Admin: list explanation requests
// ---------------------------------------------------------------------------

export async function listExplanationRequestsAdmin(
  ctx: AuthContext,
  filters: { userId?: string; limit?: number },
  supabase: SupabaseClient,
): Promise<AdminExplanationLogView[]> {
  const actor = buildActor(ctx);
  const decision = await can("translation:explanation_view_log", actor, {
    type: "explanation_request",
    id: null,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  const records = await listExplanationRequests(supabase, filters);
  return records.map(toAdminLogView);
}

function toAdminLogView(row: ExplanationRequestRecord): AdminExplanationLogView {
  return {
    id: row.id,
    workflow_key: row.workflow_key,
    context_type: row.context_type,
    field_key: row.field_key,
    state_code: row.state_code,
    source_text_hash: row.source_text_hash,
    source_text_length: row.source_text_length,
    status: row.status,
    model: row.model,
    failure_reason: row.failure_reason,
    created_at: row.created_at,
    completed_at: row.completed_at,
  };
}
