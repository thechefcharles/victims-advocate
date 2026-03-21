/**
 * UI-only helpers for matching, designation, and trust transparency.
 * Does not implement scoring — display strings and styling only.
 */

export const TRUST_MICROCOPY = {
  recommendationsLead:
    "Recommendations are based primarily on fit, availability, and accessibility.",
  designationSmallSignal:
    "Designation is used as a small trust signal when enough platform evidence exists.",
  designationNotRating:
    "Designation is not a public rating or guarantee of outcome.",
} as const;

export const TRUST_LINK_LABELS = {
  howRecommendationsWork: "How recommendations work",
  howDesignationUsed: "How designation is used",
  aboutDesignations: "About designations",
} as const;

export const TRUST_LINK_HREF = {
  matching: "/help/how-matching-works",
  designations: "/help/how-designations-work",
} as const;

export const EMPTY_COPY = {
  noMatchingResults:
    "No support organizations were recommended yet. Complete more case information or ask an advocate to review options.",
  noDesignationYet:
    "No designation on file yet. Administrators update this after internal review.",
  insufficientDataDesignation:
    "This organization does not yet have enough platform evidence for a reliable designation.",
  noReviewRequests:
    "No review requests yet. Submit a formal request below if you need clarification or a correction from platform staff.",
} as const;

/** Canonical tier labels for badges (calm, non-punitive). */
export function designationTierBadgeText(tier: string | null | undefined): string | null {
  if (tier == null || tier === "") return null;
  const key = String(tier).toLowerCase().trim().replace(/\s+/g, "_");
  switch (key) {
    case "comprehensive":
      return "Comprehensive";
    case "established":
      return "Established";
    case "foundational":
      return "Foundational";
    case "insufficient_data":
      return "Insufficient data";
    default:
      return null;
  }
}

/** Subtle chip styling for designation tier (trust context — distinct from match-fit badges). */
export function designationTrustBadgeClassName(): string {
  return "text-[10px] font-medium text-slate-400 border border-slate-600/90 rounded px-1.5 py-0.5 bg-slate-950/50";
}

/** Match fit / recommendation tier — visually distinct from designation. */
export function matchFitBadge(m: {
  strong_match: boolean;
  possible_match: boolean;
  limited_match: boolean;
}): { label: string; className: string } | null {
  if (m.strong_match) {
    return {
      label: "Good fit",
      className:
        "rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/35 px-2 py-0.5 text-[10px] font-medium",
    };
  }
  if (m.possible_match && !m.strong_match) {
    return {
      label: "Possible fit",
      className:
        "rounded-full bg-sky-500/15 text-sky-200 border border-sky-500/35 px-2 py-0.5 text-[10px] font-medium",
    };
  }
  if (m.limited_match) {
    return {
      label: "Tentative",
      className:
        "rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/35 px-2 py-0.5 text-[10px] font-medium",
    };
  }
  return null;
}

export function capacityCueLabel(capacity_signal: string | null | undefined): string | null {
  if (capacity_signal == null || capacity_signal === "") return null;
  if (capacity_signal === "accepting") return "Currently accepting clients";
  return String(capacity_signal).replace(/_/g, " ");
}

/** Confidence as secondary text — not a dominant badge. */
export function confidenceChipText(confidence: string | null | undefined): string | null {
  if (confidence == null || String(confidence).trim() === "") return null;
  return `Confidence: ${String(confidence)}`;
}

export function formatReviewStatusLabel(status: string): string {
  const s = status.toLowerCase();
  switch (s) {
    case "pending":
      return "Pending";
    case "in_review":
      return "In review";
    case "resolved":
      return "Resolved";
    case "withdrawn":
      return "Withdrawn";
    case "closed":
      return "Closed";
    case "declined":
      return "Declined";
    default:
      return status.replace(/_/g, " ");
  }
}
