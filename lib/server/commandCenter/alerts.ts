/**
 * Phase 14: Build explainable case-level alerts from routing, completeness, OCR, documents, assignment.
 */

import type { CaseAlert, AlertType, AlertSeverity } from "./types";

export type AlertInputs = {
  case_id: string;
  organization_id: string;
  status: string;
  has_routing: boolean;
  routing_evaluated_at: string | null;
  completeness_status: string | null;
  completeness_blocking_count: number;
  completeness_evaluated_at: string | null;
  ocr_has_inconsistencies: boolean;
  ocr_warning_count: number;
  document_count: number;
  restricted_document_count: number;
  assigned_advocate_id: string | null;
  last_activity_at: string | null;
  unread_victim_message_count?: number;
  missing_required_docs?: boolean;
  missing_required_fields?: boolean;
};

const NOW = () => new Date().toISOString();

function makeAlert(
  case_id: string,
  organization_id: string,
  alert_type: AlertType,
  severity: AlertSeverity,
  title: string,
  description: string,
  reason_codes: string[],
  source_refs: string[],
  action_hint: string
): CaseAlert {
  return {
    alert_type,
    severity,
    case_id,
    organization_id,
    title,
    description,
    reason_codes,
    source_refs,
    action_hint,
    created_at: NOW(),
  };
}

/**
 * Generate alerts for one case from aggregated signals. Deterministic and explainable.
 */
export function aggregateAlertsForCase(input: AlertInputs): CaseAlert[] {
  const alerts: CaseAlert[] = [];
  const {
    case_id,
    organization_id,
    status,
    has_routing,
    completeness_status,
    completeness_blocking_count,
    completeness_evaluated_at,
    ocr_has_inconsistencies,
    restricted_document_count,
    assigned_advocate_id,
    last_activity_at,
    unread_victim_message_count,
    missing_required_docs,
    missing_required_fields,
  } = input;

  const isActive = status !== "closed" && status !== "submitted";

  if (completeness_status && completeness_blocking_count > 0 && isActive) {
    alerts.push(
      makeAlert(
        case_id,
        organization_id,
        "completeness_blocking_issues",
        "critical",
        "Case still needs follow-up",
        `${completeness_blocking_count} follow-up item(s) still need to be resolved.`,
        ["completeness_blocking"],
        ["completeness"],
        "Review this case and resolve missing documents or information."
      )
    );
  }

  if (restricted_document_count > 0 && isActive) {
    alerts.push(
      makeAlert(
        case_id,
        organization_id,
        "restricted_document_present",
        "high",
        "Restricted document on case",
        `${restricted_document_count} restricted document(s) on this case.`,
        ["restricted_document"],
        ["documents"],
        "Review restricted documents and visibility if needed."
      )
    );
  }

  if (missing_required_docs && isActive) {
    alerts.push(
      makeAlert(
        case_id,
        organization_id,
        "missing_required_documents",
        "high",
        "Missing required documents",
        "Required documents are missing for at least one program.",
        ["missing_documents"],
        ["completeness", "documents"],
        "Upload required documents or run completeness to see the list."
      )
    );
  }

  if (missing_required_fields && isActive) {
    alerts.push(
      makeAlert(
        case_id,
        organization_id,
        "missing_required_information",
        "high",
        "Missing required information",
        "Required intake fields are missing or deferred.",
        ["missing_fields"],
        ["completeness"],
        "Complete intake or run completeness to see details."
      )
    );
  }

  if (ocr_has_inconsistencies && isActive) {
    alerts.push(
      makeAlert(
        case_id,
        organization_id,
        "ocr_inconsistency",
        "high",
        "Uploaded documents may need review",
        "Some uploaded document details may not match intake information.",
        ["ocr_inconsistency"],
        ["ocr"],
        "Review document checks and confirm or correct extracted details."
      )
    );
  }

  if ((unread_victim_message_count ?? 0) > 0 && isActive) {
    alerts.push(
      makeAlert(
        case_id,
        organization_id,
        "unread_victim_message",
        "high",
        "Unread victim message",
        `${unread_victim_message_count} unread message(s) from the applicant.`,
        ["unread_victim_message"],
        ["messaging"],
        "Review the applicant message and respond."
      )
    );
  }

  if (!assigned_advocate_id && isActive) {
    alerts.push(
      makeAlert(
        case_id,
        organization_id,
        "unassigned_case",
        "medium",
        "Case is unassigned",
        "No advocate is assigned to this case.",
        ["unassigned"],
        ["case_access"],
        "Assign an advocate from the case or organization."
      )
    );
  }

  if (!has_routing && isActive) {
    alerts.push(
      makeAlert(
        case_id,
        organization_id,
        "needs_program_routing",
        "medium",
        "Support programs not reviewed",
        "Support programs have not been reviewed for this case yet.",
        ["no_routing"],
        ["routing"],
        "Open the case and review support program options."
      )
    );
  }

  if (has_routing && !completeness_evaluated_at && isActive) {
    alerts.push(
      makeAlert(
        case_id,
        organization_id,
        "needs_completeness_review",
        "medium",
        "Case follow-up review not run",
        "Program review exists, but follow-up completeness review has not been run.",
        ["no_completeness"],
        ["routing", "completeness"],
        "Open the case and run follow-up review."
      )
    );
  }

  if (last_activity_at && isActive) {
    const age = Date.now() - new Date(last_activity_at).getTime();
    const twoDays = 2 * 24 * 60 * 60 * 1000;
    if (age < twoDays && age > 0) {
      alerts.push(
        makeAlert(
          case_id,
          organization_id,
          "recently_updated_case",
          "low",
          "Recently updated",
          "Case had recent activity; may need follow-up.",
          ["recent_activity"],
          ["timeline"],
          "Review timeline and take next steps if needed."
        )
      );
    }
  }

  return alerts;
}
