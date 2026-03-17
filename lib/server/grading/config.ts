/**
 * Phase C: Versioned grading configuration — weights must not be scattered.
 */

export { ORG_GRADING_VERSION } from "@/lib/grading/version";

export type GradingCategoryKey =
  | "response_accessibility"
  | "advocate_competency"
  | "case_outcomes_accuracy"
  | "victim_experience"
  | "org_reliability"
  | "system_integration";

/** Weights sum to 100 */
export const CATEGORY_WEIGHTS: Record<GradingCategoryKey, number> = {
  response_accessibility: 25,
  advocate_competency: 20,
  case_outcomes_accuracy: 20,
  victim_experience: 15,
  org_reliability: 10,
  system_integration: 10,
};

export function totalWeight(): number {
  return Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);
}
