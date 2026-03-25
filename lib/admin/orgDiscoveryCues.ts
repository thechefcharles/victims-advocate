/**
 * Lightweight, operational follow-up copy for admin/internal org discovery.
 * Not a scoring engine — single plain-language cue per context.
 */

export type OrgCueInput = {
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

export function isMatchingAlignedOrg(org: {
  status: string;
  profile_status?: string | null;
  profile_stage?: string | null;
}): boolean {
  if (org.status !== "active") return false;
  const ps = org.profile_status?.trim();
  if (ps && ps !== "active") return false;
  const stage = (org.profile_stage ?? "").trim();
  return stage === "searchable" || stage === "enriched";
}

export function buildOrgInternalFollowupCue(input: OrgCueInput): string {
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
