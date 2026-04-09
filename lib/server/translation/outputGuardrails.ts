/**
 * Domain 2.4: Translation / i18n — defense-in-depth output post-processor.
 *
 * The system prompt's BEHAVIOR_RULES catch the model 95% of the time.
 * This file is the remaining 5%: a simple regex blacklist that rejects any
 * model output containing eligibility-certainty or legal-advice phrasing.
 *
 * If a blacklist phrase is detected, applyOutputGuardrails returns
 * `safe: false` along with a generic SAFE_FALLBACK_MESSAGE. The caller
 * (explanationService) should still append DEFAULT_DISCLAIMER on top.
 *
 * NOTE: This is intentionally narrow. False positives are preferable to
 * false negatives. If a phrase looks like advice, replace the whole output.
 */

export const EXPLANATION_BLACKLIST: string[] = [
  "you will qualify",
  "you will get",
  "you should apply",
  "you definitely",
  "you are eligible",
  "you will receive",
];

export const SAFE_FALLBACK_MESSAGE =
  "We're unable to provide a specific explanation for this. Please contact your advocate or the program office for clarification.";

export type GuardrailResult = {
  safe: boolean;
  output: string;
  /** Which blacklist phrase tripped, if any. Useful for audit metadata only. */
  trippedPhrase?: string;
};

/**
 * Applies the blacklist post-processor to a model output. Case-insensitive.
 * Returns the unchanged output if safe; returns the SAFE_FALLBACK_MESSAGE
 * if any blacklist phrase is detected.
 *
 * The caller is responsible for appending DEFAULT_DISCLAIMER. This function
 * does not handle disclaimer logic.
 */
export function applyOutputGuardrails(explanation: string): GuardrailResult {
  const lower = explanation.toLowerCase();
  for (const phrase of EXPLANATION_BLACKLIST) {
    if (lower.includes(phrase)) {
      return {
        safe: false,
        output: SAFE_FALLBACK_MESSAGE,
        trippedPhrase: phrase,
      };
    }
  }
  return { safe: true, output: explanation };
}
