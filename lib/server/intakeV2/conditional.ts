/**
 * Domain 2.5 — Conditional-field evaluation.
 *
 * cvc_form_fields.conditional_on currently supports single-field rules:
 *   { field_key, operator: 'eq'|'neq'|'in'|'not_in', value }
 *
 * Both server (template-fields filter) and client (renderer) call this so
 * the rule semantics stay in one place.
 */

export interface ConditionalRule {
  field_key: string;
  operator: "eq" | "neq" | "in" | "not_in";
  value: unknown;
}

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
