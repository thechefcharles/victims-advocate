/**
 * Domain 6.1 — SignalDispute types.
 *
 * Dispute is the formal contest of an individual trust_signal_events row.
 * Distinct from ScoreDispute (which contests a ProviderScoreSnapshot).
 */

import type { SignalDisputeStatus } from "@nxtstps/registry";

export type SignalDisputeOutcome =
  | "resolved_upheld"
  | "resolved_annotated"
  | "resolved_removed";

export interface SignalDispute {
  id: string;
  organizationId: string;
  signalEventId: string;
  status: SignalDisputeStatus;
  submittedBy: string;
  assignedTo: string | null;
  providerExplanation: string;
  evidenceUrls: string[];
  resolutionReason: string | null;
  /** Admin-internal notes. Never serialized in provider-facing responses. */
  adminNotes: string | null;
  slaDeadline: string;
  slaEscalated: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Provider-safe view: strips admin_notes. */
export interface SignalDisputeProviderView {
  id: string;
  organizationId: string;
  signalEventId: string;
  status: SignalDisputeStatus;
  providerExplanation: string;
  evidenceUrls: string[];
  resolutionReason: string | null;
  slaDeadline: string;
  createdAt: string;
  updatedAt: string;
}

/** Admin view includes internal notes + assignment. */
export type SignalDisputeAdminView = SignalDispute;
