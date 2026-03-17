/**
 * Phase 14: Centralized priority derivation – deterministic and inspectable.
 */

import type { CasePriority } from "./types";
import type { CaseAlert } from "./types";

export type PriorityInput = {
  alerts: CaseAlert[];
  completeness_status: string | null;
  completeness_blocking_count: number;
  restricted_document_count: number;
  status: string;
  has_routing: boolean;
  has_completeness: boolean;
  assigned_advocate_id: string | null;
};

/**
 * Derive case priority from alerts and signals. One place, easy to read.
 */
export function deriveCasePriority(input: PriorityInput): {
  priority: CasePriority;
  reasons: string[];
} {
  const {
    alerts,
    completeness_status,
    completeness_blocking_count,
    restricted_document_count,
    status,
    has_routing,
    has_completeness,
    assigned_advocate_id,
  } = input;

  const reasons: string[] = [];
  const isActive = status !== "closed" && status !== "submitted";

  const hasCritical = alerts.some((a) => a.severity === "critical");
  const hasHigh = alerts.some((a) => a.severity === "high");
  const hasMedium = alerts.some((a) => a.severity === "medium");

  if (!isActive) {
    return { priority: "low", reasons: ["Case not active"] };
  }

  if (hasCritical || (completeness_blocking_count > 0 && completeness_status)) {
    if (completeness_blocking_count > 0) reasons.push("Blocking completeness issues");
    if (hasCritical) reasons.push("Critical alert");
    return { priority: "critical", reasons: reasons.length ? reasons : ["Blocking issues"] };
  }

  if (
    hasHigh ||
    restricted_document_count > 0 ||
    (completeness_status === "incomplete" && has_completeness) ||
    (!assigned_advocate_id && isActive)
  ) {
    if (restricted_document_count > 0) reasons.push("Restricted documents present");
    if (!assigned_advocate_id) reasons.push("Unassigned case");
    if (completeness_status === "incomplete") reasons.push("Incomplete");
    if (hasHigh) reasons.push("High-priority alert");
    return { priority: "high", reasons: reasons.length ? reasons : ["Needs attention"] };
  }

  if (hasMedium || !has_routing || (has_routing && !has_completeness)) {
    if (!has_routing) reasons.push("Routing not run");
    if (has_routing && !has_completeness) reasons.push("Completeness not run");
    if (hasMedium) reasons.push("Medium-priority alert");
    return { priority: "medium", reasons: reasons.length ? reasons : ["In progress"] };
  }

  if (has_completeness && (completeness_status === "complete" || completeness_status === "mostly_complete")) {
    reasons.push("Mostly or fully complete");
  }
  return { priority: "low", reasons: reasons.length ? reasons : ["No urgent issues"] };
}
