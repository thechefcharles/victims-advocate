/**
 * Phase 12: Document completeness & validation engine – result and issue types.
 */

export type CompletenessOverallStatus =
  | "complete"
  | "mostly_complete"
  | "incomplete"
  | "insufficient_information";

export type IssueType =
  | "missing_document"
  | "missing_field"
  | "inconsistency"
  | "warning"
  | "informational";

export type IssueSeverity = "blocking" | "warning" | "informational";

export interface CompletenessIssue {
  code: string;
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  field_key?: string | null;
  document_type?: string | null;
  program_key?: string | null;
  resolution_hint?: string | null;
}

export interface ProgramCompletenessResult {
  program_key: string;
  program_name: string;
  required_documents: string[];
  required_fields: string[];
  missing_documents: string[];
  missing_fields: string[];
  inconsistencies: CompletenessIssue[];
  issues: CompletenessIssue[];
  status: CompletenessOverallStatus;
  next_steps: string[];
}

export interface CompletenessSummaryCounts {
  missing_count: number;
  blocking_count: number;
  warning_count: number;
  informational_count: number;
}

export interface CompletenessRunResult {
  overall_status: CompletenessOverallStatus;
  program_results: ProgramCompletenessResult[];
  missing_items: CompletenessIssue[];
  inconsistencies: CompletenessIssue[];
  issues: CompletenessIssue[];
  recommended_next_actions: string[];
  summary_counts: CompletenessSummaryCounts;
  evaluated_at: string;
  engine_version: string;
}

export interface AggregatedRequirements {
  program_key: string;
  program_name: string;
  required_documents: string[];
  required_fields: string[];
  /** Optional labels for display (e.g. from KB). */
  document_labels?: Record<string, string>;
}

export const COMPLETENESS_ENGINE_VERSION = "v1";
