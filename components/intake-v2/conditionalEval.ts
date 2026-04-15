/**
 * Client copy of the conditional-evaluation rule. Kept in sync with
 * lib/server/intakeV2/conditional.ts (single source of semantics).
 */

import type { ConditionalRule } from "./types";

export function evaluateConditional(
  rule: ConditionalRule | null | undefined,
  answers: Record<string, unknown>,
): boolean {
  if (!rule) return true;
  const actual = answers[rule.field_key];
  switch (rule.operator) {
    case "eq":
      return actual === rule.value;
    case "neq":
      return actual !== rule.value;
    case "in":
      return Array.isArray(rule.value) && (rule.value as unknown[]).includes(actual);
    case "not_in":
      return Array.isArray(rule.value) && !(rule.value as unknown[]).includes(actual);
    default:
      return true;
  }
}
