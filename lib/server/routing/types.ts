/**
 * Phase 11: Routing engine – types and rule format.
 */

/** Dot-path into intake (e.g. victim.state, crime.dateOfCrime). */
export type IntakeFieldPath = string;

export type RuleOperator =
  | "exists"
  | "eq"
  | "neq"
  | "in"
  | "gte"
  | "lte"
  | "truthy";

export interface SingleRule {
  field: IntakeFieldPath;
  op: RuleOperator;
  value?: unknown;
}

export interface RuleGroup {
  all?: SingleRule[];
  any?: SingleRule[];
}

/** Top-level rule set: AND of groups or single rules. */
export type RuleSet = RuleGroup & {
  all?: (SingleRule | RuleGroup)[];
  any?: (SingleRule | RuleGroup)[];
};

export type EligibilityStatus =
  | "likely_eligible"
  | "possibly_eligible"
  | "unlikely_eligible"
  | "insufficient_information";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConditionOutcome {
  field: IntakeFieldPath;
  op: RuleOperator;
  value?: unknown;
  result: "matched" | "failed" | "unknown";
  actualValue?: unknown;
}

export interface ProgramRoutingResult {
  program_key: string;
  program_name: string;
  eligibility_status: EligibilityStatus;
  matched_conditions: ConditionOutcome[];
  failed_conditions: ConditionOutcome[];
  unknown_conditions: ConditionOutcome[];
  missing_requirements: string[];
  next_steps: string[];
  confidence: ConfidenceLevel;
  deadline_summary?: string | null;
  required_documents: string[];
  explanation?: string | null;
}

export interface RoutingRunResult {
  engine_version: string;
  programs: ProgramRoutingResult[];
  evaluated_at: string;
}

export interface ProgramDefinitionRow {
  id: string;
  created_at: string;
  updated_at: string;
  program_key: string;
  name: string;
  description: string | null;
  state_code: string | null;
  scope_type: string;
  status: string;
  is_active: boolean;
  version: string;
  rule_set: RuleSet;
  required_documents: unknown[];
  deadline_metadata: Record<string, unknown>;
  dependency_rules: Record<string, unknown>;
  stacking_rules: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface RoutingRunRow {
  id: string;
  created_at: string;
  case_id: string;
  organization_id: string;
  actor_user_id: string | null;
  intake_version: string | null;
  knowledge_version_summary: Record<string, unknown>;
  engine_version: string;
  status: "completed" | "errored";
  result: RoutingRunResult | Record<string, unknown>;
}

export const ENGINE_VERSION = "v1";
