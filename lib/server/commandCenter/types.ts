/**
 * Phase 14: Advocate Command Center – types for alerts and case summary.
 */

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export type AlertType =
  | "high_risk_case"
  | "missing_required_documents"
  | "missing_required_information"
  | "completeness_blocking_issues"
  | "ocr_inconsistency"
  | "unread_victim_message"
  | "unassigned_case"
  | "needs_program_routing"
  | "needs_completeness_review"
  | "recently_updated_case"
  | "restricted_document_present";

export interface CaseAlert {
  alert_type: AlertType;
  severity: AlertSeverity;
  case_id: string;
  organization_id: string;
  title: string;
  description: string;
  reason_codes: string[];
  source_refs: string[];
  action_hint: string;
  created_at: string;
}

export type CasePriority = "critical" | "high" | "medium" | "low";

export interface CaseSummaryEnriched {
  id: string;
  organization_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  owner_user_id: string | null;
  application: Record<string, unknown> | null;
  access: { role: string; can_view: boolean; can_edit: boolean };
  /** Resolved victim name from application.victim */
  victim_name: string;
  /** First advocate user_id from case_access, or null if unassigned */
  assigned_advocate_id: string | null;
  assigned_advocate_email?: string | null;
  priority: CasePriority;
  priority_reasons: string[];
  alert_count: number;
  alerts: CaseAlert[];
  last_activity_at: string | null;
  routing_status: "evaluated" | "not_evaluated";
  routing_evaluated_at: string | null;
  completeness_status: "complete" | "mostly_complete" | "incomplete" | "insufficient_information" | "not_evaluated";
  completeness_evaluated_at: string | null;
  completeness_blocking_count: number;
  ocr_warning: boolean;
  document_count: number;
  restricted_document_count: number;
}

export interface WorkloadByAdvocate {
  user_id: string;
  email: string | null;
  case_count: number;
  high_priority_count: number;
  blocking_completeness_count: number;
  unassigned_pool_count: number;
}

export interface CommandCenterSummary {
  active_case_count: number;
  unassigned_case_count: number;
  high_priority_count: number;
  blocking_completeness_count: number;
  ocr_warning_count: number;
  recently_updated_count: number;
}

export interface CommandCenterResponse {
  summary: CommandCenterSummary;
  alerts: CaseAlert[];
  cases: CaseSummaryEnriched[];
  workload: WorkloadByAdvocate[];
}
