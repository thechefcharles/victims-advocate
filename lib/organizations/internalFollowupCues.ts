/**
 * Operational follow-up copy for admin and ecosystem org rows (not scoring).
 * Used by `/admin/orgs`, `/admin/ecosystem`, and server-side org summaries.
 *
 * @see docs/org-system-boundaries.md
 */

export type OrgFollowupCueInput = {
  orgStatus: string;
  profileStatus: string | null;
  profileStage: string | null;
  capacityStatus?: string | null;
  acceptingClients?: boolean | null;
  designationTier: string | null;
  designationConfidence: string | null;
  routingInWindow?: number;
  completenessInWindow?: number;
  workflowMessagesInWindow?: number;
};

export function buildOrgInternalFollowupCue(input: OrgFollowupCueInput): string {
  if (input.orgStatus !== "active") {
    return "Review organization status when this partner should be active.";
  }
  const ps = input.profileStatus?.trim();
  if (ps && ps !== "active") {
    return "Profile is not active — confirm before using in matching.";
  }
  const stage = (input.profileStage ?? "").trim() || "created";
  if (stage === "created") {
    return "Complete required profile fields so the organization can become searchable for matching.";
  }
  const cap = String(input.capacityStatus ?? "").toLowerCase();
  if (cap === "waitlist" || cap === "limited") {
    return "Check capacity and availability — listed as limited or waitlist.";
  }
  if (input.acceptingClients === false) {
    return "Not currently accepting clients — confirm intake status.";
  }
  if (!input.designationTier && (stage === "searchable" || stage === "enriched")) {
    return "Run grading, then review designation when ready.";
  }
  if (
    input.designationTier === "insufficient_data" ||
    input.designationConfidence === "low"
  ) {
    return "Review designation confidence or sparse platform signals.";
  }
  const wfSum =
    (input.routingInWindow ?? 0) +
    (input.completenessInWindow ?? 0) +
    (input.workflowMessagesInWindow ?? 0);
  if (wfSum < 2 && (stage === "searchable" || stage === "enriched")) {
    return "Light workflow activity in this window — platform signals may still be sparse.";
  }
  return "Open profile for a routine readiness check.";
}
