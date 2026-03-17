/**
 * Phase D: Calm, non-punitive copy for designations.
 */

import type { OrgQualityScoreRow } from "@/lib/server/grading/types";
import type { DesignationConfidence, DesignationTier } from "./types";

type CatEntry = { score?: number; confidence?: string };

/** Qualitative bands only — no raw numbers in snapshot for public-facing use */
export function buildCategorySnapshotQualitative(
  grading: OrgQualityScoreRow | null
): Record<string, unknown> {
  if (!grading?.category_scores) {
    return { highlights: [] as string[] };
  }
  const cs = grading.category_scores as Record<string, CatEntry>;
  const highlights: string[] = [];
  const bands: Record<string, string> = {};

  for (const [key, val] of Object.entries(cs)) {
    const s = typeof val?.score === "number" ? val.score : 0;
    let band: string;
    if (s >= 75) band = "strong";
    else if (s >= 55) band = "solid";
    else if (s >= 40) band = "developing";
    else band = "emerging";
    bands[key] = band;
    const label = key.replace(/_/g, " ");
    if (band === "strong" || band === "solid") {
      highlights.push(`${label}: structured readiness observed`);
    }
  }

  return { highlights: highlights.slice(0, 5), bands };
}

export function buildPublicSummary(params: {
  tier: DesignationTier;
  designation_confidence: DesignationConfidence;
  grading: OrgQualityScoreRow | null;
}): string {
  const { tier, designation_confidence } = params;
  const suffix =
    " This designation reflects platform-visible readiness and workflow use, not a clinical or legal rating. It may change as more information becomes available.";

  if (tier === "insufficient_data") {
    return (
      "There is not yet enough platform activity to summarize this organization’s structured readiness. " +
      "Continuing to use profiles, cases, and workflows will allow a clearer picture over time." +
      suffix
    );
  }

  if (tier === "comprehensive") {
    return (
      "This organization currently shows strong structured readiness across response access, case workflows, and service visibility on the platform." +
      (designation_confidence === "high"
        ? " Confidence in this picture is relatively high based on available signals."
        : " Additional activity may refine this picture.") +
      suffix
    );
  }

  if (tier === "established") {
    return (
      "This organization shows solid structured capability on the platform across several areas, with room to deepen workflow and engagement over time." +
      suffix
    );
  }

  return (
    "This organization is building its structured presence on the platform. Continued use of workflows, messaging, and profile completeness will support a fuller picture." +
    suffix
  );
}
