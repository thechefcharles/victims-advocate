/**
 * Phase E: Public-safe designation explanations and methodology links (no raw scores).
 */

import type { DesignationTier } from "./types";

export const METHODOLOGY = {
  matchingPath: "/help/how-matching-works",
  designationPath: "/help/how-designations-work",
  transparencyPath: "/help/transparency",
} as const;

export function methodologyLinks(): Array<{ label: string; href: string; description: string }> {
  return [
    {
      label: "How survivor–organization matching works",
      href: METHODOLOGY.matchingPath,
      description:
        "Deterministic matching from intake needs and organization profiles — not rankings or reviews.",
    },
    {
      label: "How organization designations work",
      href: METHODOLOGY.designationPath,
      description:
        "Readiness tiers derived from internal platform signals — not public grades or scores.",
    },
    {
      label: "Transparency overview",
      href: METHODOLOGY.transparencyPath,
      description: "What we show, what we keep internal, and how to request a review.",
    },
  ];
}

export function explainDesignationTier(tier: DesignationTier): {
  headline: string;
  bullets: string[];
} {
  const common = [
    "Designations describe structured readiness visible on the platform, not clinical quality or legal outcomes.",
    "We do not publish numeric quality scores.",
  ];
  switch (tier) {
    case "comprehensive":
      return {
        headline: "Comprehensive readiness",
        bullets: [
          ...common,
          "This tier reflects strong signals across response access, workflows, and service visibility on NxtStps.",
          "Additional platform use may still refine the picture over time.",
        ],
      };
    case "established":
      return {
        headline: "Established readiness",
        bullets: [
          ...common,
          "This tier reflects solid structured capability in several areas, with room to grow.",
        ],
      };
    case "foundational":
      return {
        headline: "Foundational readiness",
        bullets: [
          ...common,
          "This tier reflects an organization that is building its structured presence on the platform.",
        ],
      };
    default:
      return {
        headline: "Insufficient data to summarize",
        bullets: [
          "There is not yet enough consistent platform activity to assign a readiness tier.",
          "This is not a negative judgment — more profile and workflow use typically allows a clearer designation later.",
          ...common.slice(0, 1),
        ],
      };
  }
}

export function explainMatchingPublic(): { headline: string; bullets: string[] } {
  return {
    headline: "Needs-based matching",
    bullets: [
      "Recommendations use structured intake information (services needed, language, location, accessibility, and similar fields) compared to organization profiles.",
      "Results are explainable: each suggestion includes reasons such as service overlap or service area fit.",
      "Matching does not use public reviews, star ratings, or “best organization” rankings.",
      "Organization designations (tiers) are separate from matching today and do not determine match order in a punitive way.",
    ],
  };
}
