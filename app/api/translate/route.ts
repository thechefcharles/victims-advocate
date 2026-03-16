// app/api/translate/route.ts
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { requireAcceptedPolicies } from "@/lib/server/policies";
import { apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { sha256Hex } from "@/lib/server/audit/hash";
import { buildExplainSystemPrompt, buildExplainUserPrompt } from "@/lib/server/translator/buildPrompt";
import type { ExplainRequest, ExplainContextType } from "@/lib/server/translator/types";
import { DEFAULT_DISCLAIMER, MAX_EXPLANATION_LENGTH } from "@/lib/server/translator/types";

export const runtime = "nodejs";

type Lang = "auto" | "en" | "es";
type TargetLang = "en" | "es";

/** Phase 9: "Explain this" request body */
type ExplainBody = {
  sourceText: string;
  contextType?: ExplainContextType | string;
  workflowKey?: string;
  fieldKey?: string | null;
  programKey?: string | null;
  stateCode?: string | null;
  userRole?: string | null;
};

type TranslateSingleBody = {
  sourceLang?: Lang;
  targetLang: TargetLang;
  text: string;
  context?: string;
};

type TranslateBatchBody = {
  sourceLang?: Lang;
  targetLang: TargetLang;
  items: Array<{ key: string; text: string }>;
  context?: string;
};

type RequestBody = ExplainBody | TranslateSingleBody | TranslateBatchBody;

function isExplainBody(body: unknown): body is ExplainBody {
  const b = body as Record<string, unknown>;
  return typeof b?.sourceText === "string" && b.sourceText.trim().length > 0;
}

function isBatch(body: RequestBody): body is TranslateBatchBody {
  return (body as TranslateBatchBody).items !== undefined;
}

function cleanText(s: string) {
  return (s ?? "").toString().trim();
}

function langLabel(l: Lang | TargetLang) {
  if (l === "en") return "English";
  if (l === "es") return "Spanish";
  return "Auto-detect";
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    await requireAcceptedPolicies({
      ctx,
      requiredDocs: [{ docType: "ai_disclaimer", workflowKey: "translator" }],
      req,
    });

    const apiKey = config.openaiApiKey;
    if (!apiKey) {
      logger.error("translate.config_missing", { missing: "OPENAI_API_KEY" });
      return apiFail("INTERNAL", "Missing OPENAI_API_KEY", undefined, 500);
    }

    const body = (await req.json().catch(() => null)) as RequestBody | null;
    if (!body) {
      return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 400);
    }

    // ——— Phase 9: "Explain this" path ———
    if (isExplainBody(body)) {
      const sourceText = (body.sourceText ?? "").trim();
      const explainReq: ExplainRequest = {
        sourceText,
        contextType: (body.contextType as ExplainContextType) ?? "general",
        workflowKey: body.workflowKey ?? "translator",
        fieldKey: body.fieldKey ?? null,
        programKey: body.programKey ?? null,
        stateCode: body.stateCode ?? null,
        userRole: body.userRole ?? ctx.role ?? null,
      };

      let sourceHash: string;
      try {
        sourceHash = await sha256Hex(sourceText);
      } catch {
        sourceHash = "[hash_failed]";
      }

      await logEvent({
        ctx,
        action: "translator.requested",
        resourceType: "translator",
        metadata: {
          context_type: explainReq.contextType,
          workflow_key: explainReq.workflowKey,
          field_key: explainReq.fieldKey ?? null,
          state_code: explainReq.stateCode ?? null,
          program_key: explainReq.programKey ?? null,
          source_text_hash: sourceHash,
          source_text_length: sourceText.length,
        },
        req,
      }).catch(() => {});

      try {
        const systemPrompt = buildExplainSystemPrompt();
        const userPrompt = buildExplainUserPrompt(explainReq);
        const model = process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-4o-mini";

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
          logger.error("translate.explain_openai_failed", { status: res.status });
          await logEvent({
            ctx,
            action: "translator.blocked",
            resourceType: "translator",
            metadata: {
              context_type: explainReq.contextType,
              workflow_key: explainReq.workflowKey,
              source_text_hash: sourceHash,
              source_text_length: sourceText.length,
              result_status: "openai_error",
            },
            req,
          }).catch(() => {});
          return apiFail("INTERNAL", "Explanation request failed", undefined, 500);
        }

        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const raw = (data?.choices?.[0]?.message?.content ?? "").trim();

        if (!raw) {
          await logEvent({
            ctx,
            action: "translator.blocked",
            resourceType: "translator",
            metadata: {
              context_type: explainReq.contextType,
              workflow_key: explainReq.workflowKey,
              source_text_hash: sourceHash,
              result_status: "empty_response",
            },
            req,
          }).catch(() => {});
          return apiFail("INTERNAL", "Empty explanation response", undefined, 500);
        }

        let explanation = raw.length > MAX_EXPLANATION_LENGTH
          ? raw.slice(0, MAX_EXPLANATION_LENGTH - 3) + "..."
          : raw;
        const hasDisclaimer = /legal advice|general information/i.test(explanation);
        const disclaimer = hasDisclaimer ? undefined : DEFAULT_DISCLAIMER;

        await logEvent({
          ctx,
          action: "translator.completed",
          resourceType: "translator",
          metadata: {
            context_type: explainReq.contextType,
            workflow_key: explainReq.workflowKey,
            field_key: explainReq.fieldKey ?? null,
            source_text_hash: sourceHash,
            source_text_length: sourceText.length,
            result_status: "completed",
          },
          req,
        }).catch(() => {});

        return NextResponse.json({
          ok: true,
          data: { explanation, disclaimer },
        });
      } catch (err) {
        const appErr = toAppError(err);
        logger.error("translate.explain_error", { code: appErr.code, message: appErr.message });
        await logEvent({
          ctx,
          action: "translator.blocked",
          resourceType: "translator",
          metadata: {
            context_type: explainReq.contextType,
            workflow_key: explainReq.workflowKey,
            source_text_hash: sourceHash,
            result_status: "error",
          },
          req,
        }).catch(() => {});
        return apiFailFromError(appErr);
      }
    }

    // ——— Legacy translation path ———
    const sourceLang: Lang = (body as any).sourceLang ?? "auto";
    const targetLang: TargetLang = (body as any).targetLang;
    const context = (body as any).context ?? "Victim compensation application intake";

    if (targetLang !== "en" && targetLang !== "es") {
      return apiFail(
        "VALIDATION_ERROR",
        "Invalid targetLang. Expected \"en\" or \"es\".",
        undefined,
        400
      );
    }

    // Build the content to translate
    let payload:
      | { mode: "single"; text: string }
      | { mode: "batch"; items: Array<{ key: string; text: string }> };

    if (isBatch(body)) {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) {
        return apiFail(
          "VALIDATION_ERROR",
          "items[] is required for batch translation",
          undefined,
          400
        );
      }

      // Keep only non-empty strings
      const cleaned = items
        .map((it) => ({ key: it.key, text: cleanText(it.text) }))
        .filter((it) => it.key && it.text);

      payload = { mode: "batch", items: cleaned };
    } else {
      const text = cleanText((body as TranslateSingleBody).text);
      if (!text) {
        return apiFail("VALIDATION_ERROR", "text is required for translation", undefined, 400);
      }
      payload = { mode: "single", text };
    }

    // IMPORTANT GUARDRAILS:
    // - Output ONLY translated text(s), no extra commentary
    // - Preserve punctuation, numbers, dates, capitalization, line breaks
    // - Do NOT translate proper nouns, names, addresses, emails, phone numbers, IDs
    // - If something is already in target language, keep it
    const system = [
      "You are a professional translation engine for sensitive legal-intake content.",
      "Return ONLY the translation output. No commentary, no explanations, no quotes unless present in the input.",
      "Preserve formatting: line breaks, bullet points, punctuation, capitalization, and numbers.",
      "Do NOT translate: names, street addresses, cities, states, ZIP codes, phone numbers, emails, IDs, report numbers, case numbers, organization names.",
      "If a segment is already in the target language, keep it as-is.",
    ].join("\n");

    const user = (() => {
      const from = langLabel(sourceLang);
      const to = langLabel(targetLang);

      if (payload.mode === "single") {
        return [
          `Context: ${context}`,
          `Translate from: ${from}`,
          `Translate to: ${to}`,
          "",
          "TEXT:",
          payload.text,
        ].join("\n");
      }

      // Batch: ask model to return JSON exactly
      return [
        `Context: ${context}`,
        `Translate from: ${from}`,
        `Translate to: ${to}`,
        "",
        "Return STRICT JSON with this shape and nothing else:",
        `{ "items": [ { "key": "string", "text": "string" } ] }`,
        "",
        "Translate these items:",
        JSON.stringify({ items: payload.items }, null, 2),
      ].join("\n");
    })();

    // Call OpenAI via REST (no SDK required)
    // Model choice: keep it stable and good at instruction-following.
    const model = process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-4o-mini";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      logger.error("translate.openai_failed", { status: res.status });
      return apiFail("INTERNAL", "OpenAI request failed", undefined, 500);
    }

    const data = (await res.json()) as any;
    const content = data?.choices?.[0]?.message?.content ?? "";

    if (!content) {
      logger.warn("translate.empty_response", {});
      return apiFail("INTERNAL", "Empty translation response", undefined, 500);
    }

    if (payload.mode === "single") {
      // Return as plain JSON
      return NextResponse.json({ text: content });
    }

    // Batch mode expects JSON. Parse safely.
    try {
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed?.items) ? parsed.items : [];

      // Normalize output shape
      return NextResponse.json({
        items: items
          .map((it: any) => ({
            key: String(it?.key ?? ""),
            text: String(it?.text ?? ""),
          }))
          .filter((it: any) => it.key && it.text),
      });
    } catch {
      logger.warn("translate.batch_parse_failed", {});
      return apiFail(
        "INTERNAL",
        "Batch translation returned non-JSON output",
        undefined,
        500
      );
    }
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("translate.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}