/**
 * Phase C: Category definitions — auditable metadata for each scoring dimension.
 */

import type { GradingCategoryKey } from "./config";
import { CATEGORY_WEIGHTS } from "./config";

export type CategoryDefinition = {
  key: GradingCategoryKey;
  weight: number;
  description: string;
  scoring_rules: string[];
  confidence_rules: string[];
  input_sources: string[];
};

export const GRADING_CATEGORIES: Record<GradingCategoryKey, CategoryDefinition> = {
  response_accessibility: {
    key: "response_accessibility",
    weight: CATEGORY_WEIGHTS.response_accessibility,
    description:
      "How reachable and accessible the organization appears: capacity, languages, intake channels, stated response time, and profile signals.",
    scoring_rules: [
      "Higher when accepting_clients, open/limited capacity, and intake_methods are populated.",
      "Languages and accessibility_features increase score when present.",
      "avg_response_time_hours from org profile boosts score when low (faster).",
      "Sparse profile reduces category confidence, not necessarily the raw score as harshly.",
    ],
    confidence_rules: [
      "Low if fewer than 2 of: capacity clarity, languages, intake_methods, response time.",
      "Medium if profile has partial coverage.",
      "High when 4+ response/accessibility fields are meaningfully set.",
    ],
    input_sources: [
      "organizations.accepting_clients",
      "organizations.capacity_status",
      "organizations.languages",
      "organizations.accessibility_features",
      "organizations.intake_methods",
      "organizations.avg_response_time_hours",
    ],
  },
  advocate_competency: {
    key: "advocate_competency",
    weight: CATEGORY_WEIGHTS.advocate_competency,
    description:
      "Proxy for structured advocate practice using platform workflows (not clinical competency).",
    scoring_rules: [
      "Based on org profile completeness and use of routing/completeness on cases.",
      "Does not claim real-world training or certification.",
      "Conservative cap when case volume is very low.",
    ],
    confidence_rules: [
      "Low when case_count < 3 and workflow signals absent.",
      "Medium with some cases and some workflow usage.",
      "High with 10+ cases and consistent routing/completeness usage.",
    ],
    input_sources: [
      "organizations profile fields",
      "cases count per org",
      "routing_runs distinct cases",
      "completeness_runs distinct cases",
    ],
  },
  case_outcomes_accuracy: {
    key: "case_outcomes_accuracy",
    weight: CATEGORY_WEIGHTS.case_outcomes_accuracy,
    description:
      "Workflow rigor on cases: routing and documentation completeness runs (proxy for application accuracy, not legal outcomes).",
    scoring_rules: [
      "Ratio of cases with at least one routing run.",
      "Ratio of cases with at least one completeness run.",
      "OCR usage on documents as additional rigor signal.",
    ],
    confidence_rules: [
      "Low if fewer than 3 cases (cannot infer patterns).",
      "Medium with 3–9 cases.",
      "High with 10+ cases and measurable workflow ratios.",
    ],
    input_sources: ["routing_runs", "completeness_runs", "cases", "ocr_runs"],
  },
  victim_experience: {
    key: "victim_experience",
    weight: CATEGORY_WEIGHTS.victim_experience,
    description:
      "Proxy for victim-facing responsiveness via secure messaging activity (not surveys).",
    scoring_rules: [
      "Message volume and advocate-originated messages in recent window.",
      "Does not measure satisfaction — only platform engagement proxy.",
    ],
    confidence_rules: [
      "Low if almost no messages.",
      "Medium with some advocate messages.",
      "High with sustained two-way thread patterns (approximated by counts).",
    ],
    input_sources: ["case_messages.sender_role", "case_messages.created_at"],
  },
  org_reliability: {
    key: "org_reliability",
    weight: CATEGORY_WEIGHTS.org_reliability,
    description:
      "Profile maintenance and recent case activity (continuity of engagement).",
    scoring_rules: [
      "profile_last_updated_at recency.",
      "Recent case volume (90 days).",
    ],
    confidence_rules: [
      "Low without profile update timestamp and no recent cases.",
      "Medium with one strong signal.",
      "High with recent profile update and active cases.",
    ],
    input_sources: [
      "organizations.profile_last_updated_at",
      "cases.created_at (90d window)",
    ],
  },
  system_integration: {
    key: "system_integration",
    weight: CATEGORY_WEIGHTS.system_integration,
    description: "Adoption of NxtStps structured workflows: messaging, OCR, routing, completeness.",
    scoring_rules: [
      "Weighted blend of messaging, OCR runs, routing/completeness penetration.",
    ],
    confidence_rules: [
      "Low if no workflow artifacts.",
      "Medium if any two artifact types present.",
      "High if messaging + OCR + (routing or completeness) on meaningful volume.",
    ],
    input_sources: ["case_messages", "ocr_runs", "routing_runs", "completeness_runs"],
  },
};
