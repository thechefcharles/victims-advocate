/**
 * Phase E: Public-safe designation explanations and methodology links (no raw scores).
 * Designation is a secondary trust signal vs fit-first matching (`docs/org-system-boundaries.md`).
 */

import type { DesignationTier } from "./types";
import type { DesignationConfidence } from "./types";
import type { OrganizationSignals } from "@/lib/server/orgSignals/types";

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

export function buildDesignationConfidenceNote(params: {
  confidence: DesignationConfidence;
  tier: DesignationTier;
  signalFlags: string[];
}): string {
  if (params.tier === "insufficient_data") {
    return "There is not yet enough platform evidence to show a reliable designation.";
  }
  if (params.signalFlags.includes("insufficient_case_volume")) {
    return "Confidence is limited because current case volume is still low.";
  }
  if (params.signalFlags.includes("limited_message_data")) {
    return "Confidence is limited because messaging evidence is still sparse.";
  }
  if (params.signalFlags.includes("workflow_usage_sparse")) {
    return "Confidence is limited because workflow usage signals are still sparse.";
  }
  if (params.confidence === "high") {
    return "Confidence is higher because platform signals are more consistent.";
  }
  if (params.confidence === "medium") {
    return "Confidence is moderate and may improve as more platform evidence accumulates.";
  }
  return "Confidence is currently limited and should be interpreted cautiously.";
}

export function buildDesignationImprovementHints(signals: OrganizationSignals | null): string[] {
  if (!signals) {
    return [
      "Keep your organization profile current as programs, services, and coverage change.",
      "Use core case workflows consistently so platform evidence is more reliable over time.",
    ];
  }

  const hints: string[] = [];
  if (signals.profile.profileStage !== "searchable" && signals.profile.profileStage !== "enriched") {
    hints.push("Complete the required organization profile fields so your profile is searchable.");
  }
  if (signals.profile.completeness !== "complete") {
    hints.push("Add service, language, and coverage details to improve profile completeness.");
  }
  if (signals.workflow.routingUsageRate != null && signals.workflow.routingUsageRate < 0.4) {
    hints.push("Use routing consistently on active cases when appropriate.");
  }
  if (
    signals.workflow.completenessUsageRate != null &&
    signals.workflow.completenessUsageRate < 0.4
  ) {
    hints.push("Run completeness checks regularly to strengthen workflow reliability signals.");
  }
  if (signals.messaging.replySignalConfidence === "low") {
    hints.push("Use case-based messaging consistently when coordinating with survivors.");
  }
  if (!signals.profile.lastProfileUpdate) {
    hints.push("Keep profile and capacity details up to date as operations change.");
  }

  return hints.slice(0, 4);
}

export function buildDesignationInternalExplanation(params: {
  tier: DesignationTier;
  confidence: DesignationConfidence;
  signalFlags: string[];
  signals: OrganizationSignals | null;
}): { headline: string; bullets: string[] } {
  const bullets: string[] = [];
  const s = params.signals;
  if (s) {
    bullets.push(
      `Profile stage: ${s.profile.profileStage ?? "unknown"}; completeness: ${s.profile.completeness ?? "unknown"}.`
    );
    bullets.push(
      `Cases: total ${s.cases.total}, active ${s.cases.active}, stale ${s.cases.stale}.`
    );
    bullets.push(
      `Workflow usage: routing ${s.workflow.routingUsageRate == null ? "n/a" : `${Math.round(s.workflow.routingUsageRate * 100)}%`}, completeness ${
        s.workflow.completenessUsageRate == null
          ? "n/a"
          : `${Math.round(s.workflow.completenessUsageRate * 100)}%`
      }, OCR ${s.workflow.ocrUsageRate == null ? "n/a" : `${Math.round(s.workflow.ocrUsageRate * 100)}%`}.`
    );
  }
  if (params.signalFlags.length > 0) {
    bullets.push(
      `Signal caveats: ${params.signalFlags
        .map((f) => f.replace(/_/g, " "))
        .join(", ")}.`
    );
  }
  bullets.push(buildDesignationConfidenceNote({
    confidence: params.confidence,
    tier: params.tier,
    signalFlags: params.signalFlags,
  }));
  return {
    headline: "How this designation confidence was derived",
    bullets: bullets.slice(0, 5),
  };
}
