/**
 * Phase C: Grading types.
 */

import type { GradingCategoryKey } from "./config";

export type ScoreConfidence = "low" | "medium" | "high";

export type CategoryScoreDetail = {
  score: number;
  weight: number;
  weighted_score: number;
  confidence: ScoreConfidence;
  reasons: string[];
  input_summary: Record<string, unknown>;
};

export type OrgScoringInputs = {
  organization_id: string;
  org_name: string;
  profile_completeness_0_1: number;
  accepting_clients: boolean;
  capacity_status: string;
  avg_response_time_hours: number | null;
  languages_count: number;
  accessibility_count: number;
  intake_methods_count: number;
  service_types_count: number;
  profile_last_updated_at: string | null;
  profile_last_updated_days_ago: number | null;
  case_count_total: number;
  case_count_90d: number;
  cases_with_routing: number;
  cases_with_completeness: number;
  routing_ratio_0_1: number;
  completeness_ratio_0_1: number;
  case_messages_total: number;
  advocate_messages_30d: number;
  victim_messages_30d: number;
  ocr_runs_total: number;
  appointments_completed: number;
  appointments_total_tracked: number;
};

export type GradingEvaluationResult = {
  overall_score: number;
  score_confidence: ScoreConfidence;
  category_scores: Record<GradingCategoryKey, CategoryScoreDetail>;
  inputs_summary: Record<string, unknown>;
  flags: string[];
};

export type OrgQualityScoreRow = {
  id: string;
  created_at: string;
  organization_id: string;
  computed_at: string;
  score_version: string;
  overall_score: number;
  score_confidence: ScoreConfidence;
  category_scores: Record<string, unknown>;
  inputs_summary: Record<string, unknown>;
  flags: string[];
  status: string;
  computed_by: string | null;
};
