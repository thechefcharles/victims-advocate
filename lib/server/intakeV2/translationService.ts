/**
 * Intake-v2 Spanish → English answer translation.
 *
 * Called exactly once per session, at submit time, from intakeV2Service.
 * The result is cached under intake_v2_sessions.answers_en so the PDF
 * download route can render without any per-download model calls.
 *
 * Routing: goes through the aiOps orchestrator in `applicant_guidance` mode,
 * with resolveModelInvoker() picking the real Anthropic SDK in production
 * and the deterministic stub when ANTHROPIC_API_KEY is absent (dev / tests).
 *
 * Translation rules:
 *  - Only string values are translated. Booleans, numbers, arrays, enum
 *    values (e.g. 'male', 'yes', 'single') pass through unchanged — those
 *    are canonical codes, not user-authored Spanish prose.
 *  - Enum-like short strings that match /^[a-z_]+$/ are skipped (same
 *    reason).
 *  - Duplicate translations are memoized within a single call.
 *  - On model failure, the Spanish value is preserved under the same key
 *    in answers_en so the PDF still contains *something* rather than
 *    silently dropping answers. Failure is logged.
 */

import { orchestrate } from "@/lib/server/aiOps/aiOrchestrator";
import { resolveModelInvoker } from "@/lib/server/aiOps/modelInvoker";
import { logger } from "@/lib/server/logging";

const ENUM_CODE_RE = /^[a-z][a-z0-9_]*$/;

function isTranslatableString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  // Skip canonical enum codes ("male", "single", "yes", "not_listed", …) — the
  // intake stores those regardless of UI locale.
  if (ENUM_CODE_RE.test(trimmed)) return false;
  return true;
}

export async function translateAnswersToEnglish(
  answers: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  const cache = new Map<string, string>();
  const invoker = resolveModelInvoker();

  for (const [key, value] of Object.entries(answers)) {
    if (!isTranslatableString(value)) {
      out[key] = value;
      continue;
    }
    const src = value.trim();
    const cached = cache.get(src);
    if (cached !== undefined) {
      out[key] = cached;
      continue;
    }
    try {
      const result = await orchestrate(
        {
          mode: "applicant_guidance",
          userMessage:
            `Translate the following text from Spanish to English. Return only the translated English text — no preface, no quotes, no explanation.\n\nText: ${src}`,
          // We don't pass intake context; the value is self-contained prose
          // from a form field and we want the translation to be literal.
          context: {},
          actor: { userId: "system:intake-v2-translation", accountType: "system" },
        },
        invoker,
      );
      const translated = (result.response ?? "").trim();
      const finalValue = translated.length > 0 ? translated : src;
      cache.set(src, finalValue);
      out[key] = finalValue;
    } catch (err) {
      logger.warn("intake_v2.translation.field_failed", {
        field_key: key,
        error: err instanceof Error ? err.message : String(err),
      });
      // Preserve the Spanish value rather than silently dropping it.
      out[key] = src;
    }
  }

  return out;
}
