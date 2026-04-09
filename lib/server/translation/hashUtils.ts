/**
 * Domain 2.4: Translation / i18n — hash wrapper for explanation source text.
 *
 * Thin wrapper over @/lib/server/audit/hash so the translation module has a
 * semantic name for the operation. The hash is the ONLY representation of
 * source text persisted anywhere — never store the raw text alongside it.
 */

import { sha256Hex } from "@/lib/server/audit/hash";

/**
 * Returns the sha256 hex digest of the source text. This value goes into
 * explanation_requests.source_text_hash and audit log metadata.
 *
 * The raw `text` argument MUST NOT be persisted anywhere except in the
 * synchronous OpenAI request lifetime. Domain 2.4's hard rule.
 */
export async function hashExplanationSourceText(text: string): Promise<string> {
  return sha256Hex(text);
}
