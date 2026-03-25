/**
 * Phase D: Map internal grading → public-safe designation tier (no raw score in outputs for public APIs).
 */

import type { OrgQualityScoreRow } from "@/lib/server/grading/types";
import type { OrganizationSignals } from "@/lib/server/orgSignals/types";
import {
  THRESHOLD_COMPREHENSIVE,
  THRESHOLD_ESTABLISHED_MIN,
  THRESHOLD_FOUNDATIONAL_FLOOR,
} from "./config";
import type { DesignationConfidence, DesignationEvaluation, DesignationTier } from "./types";
import { buildCategorySnapshotQualitative, buildPublicSummary } from "./summary";

function hasFlag(flags: string[], f: string): boolean {
  return flags.some((x) => x.toLowerCase() === f.toLowerCase());
}

function deriveDesignationConfidence(
  tier: DesignationTier,
  gradingConfidence: OrgQualityScoreRow["score_confidence"] | null,
  signalFlags: string[]
): DesignationConfidence {
  if (tier === "insufficient_data") {
    return "low";
  }
  if (signalFlags.includes("insufficient_case_volume")) return "low";
  if (signalFlags.includes("limited_message_data")) return "low";
  if (signalFlags.includes("workflow_usage_sparse")) return "low";
  if (signalFlags.includes("profile_not_searchable")) return "low";
  if (gradingConfidence === "high" && tier === "comprehensive") {
    return "high";
  }
  if (gradingConfidence === "high" && (tier === "established" || tier === "foundational")) {
    return "medium";
  }
  if (gradingConfidence === "medium") {
    return tier === "comprehensive" ? "medium" : "medium";
  }
  return "medium";
}

export function evaluateDesignationFromGrading(
  grading: OrgQualityScoreRow | null,
  signals: OrganizationSignals | null
): Omit<DesignationEvaluation, "public_summary"> & { grading_for_summary: OrgQualityScoreRow | null } {
  const flags: string[] = [];
  let tier: DesignationTier = "insufficient_data";
  let gradingConfidence: OrgQualityScoreRow["score_confidence"] | null = null;

  if (!grading) {
    flags.push("grading_not_available");
    flags.push("insufficient_data");
    return {
      designation_tier: "insufficient_data",
      designation_confidence: "low",
      flags,
      category_snapshot: buildCategorySnapshotQualitative(null),
      grading_snapshot: {
        grading_run_id: null,
        grading_version: null,
        overall_score_band: "not_computed",
      },
      grading_for_summary: null,
    };
  }

  gradingConfidence = grading.score_confidence;
  const signalFlags = signals?.flags ?? [];
  for (const f of signalFlags) {
    if (
      [
        "insufficient_case_volume",
        "limited_message_data",
        "workflow_usage_sparse",
        "profile_not_searchable",
        "appointments_not_available",
      ].includes(f)
    ) {
      flags.push(f);
    }
  }

  const gf = grading.flags ?? [];
  for (const f of gf) {
    if (
      [
        "insufficient_data",
        "limited_case_volume",
        "profile_incomplete",
        "workflow_usage_low",
      ].includes(f)
    ) {
      flags.push(f);
    }
  }

  const score = grading.overall_score;
  const lowGradingConfidence = gradingConfidence === "low";
  const insufficientSignal =
    lowGradingConfidence ||
    hasFlag(gf, "insufficient_data") ||
    signalFlags.includes("profile_not_searchable") ||
    (signalFlags.includes("insufficient_case_volume") &&
      signalFlags.includes("workflow_usage_sparse")) ||
    (hasFlag(gf, "limited_case_volume") &&
      hasFlag(gf, "profile_incomplete") &&
      score < THRESHOLD_ESTABLISHED_MIN);

  if (insufficientSignal || (score < THRESHOLD_FOUNDATIONAL_FLOOR && lowGradingConfidence)) {
    tier = "insufficient_data";
    if (!hasFlag(flags, "insufficient_data")) flags.push("insufficient_platform_signals");
  } else if (
    score >= THRESHOLD_COMPREHENSIVE &&
    gradingConfidence !== "low" &&
    !hasFlag(gf, "insufficient_data")
  ) {
    tier = "comprehensive";
  } else if (score >= THRESHOLD_ESTABLISHED_MIN) {
    tier = "established";
  } else {
    tier = "foundational";
  }

  const designation_confidence = deriveDesignationConfidence(
    tier,
    gradingConfidence,
    signalFlags
  );

  return {
    designation_tier: tier,
    designation_confidence,
    flags: [...new Set(flags)],
    category_snapshot: buildCategorySnapshotQualitative(grading),
    grading_snapshot: {
      grading_run_id: grading.id,
      grading_version: grading.score_version,
      overall_score_band: "hidden",
    },
    grading_for_summary: grading,
  };
}

export function finalizeDesignationEvaluation(
  partial: ReturnType<typeof evaluateDesignationFromGrading>
): DesignationEvaluation {
  const public_summary = buildPublicSummary({
    tier: partial.designation_tier,
    designation_confidence: partial.designation_confidence,
    grading: partial.grading_for_summary,
  });

  return {
    designation_tier: partial.designation_tier,
    designation_confidence: partial.designation_confidence,
    flags: partial.flags,
    category_snapshot: partial.category_snapshot,
    public_summary,
    grading_snapshot: partial.grading_snapshot,
  };
}
