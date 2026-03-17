import type { OrgQualityScoreRow } from "@/lib/server/grading/types";

export type DesignationTier =
  | "comprehensive"
  | "established"
  | "foundational"
  | "insufficient_data";

export type DesignationConfidence = "low" | "medium" | "high";

export type DesignationEvaluation = {
  designation_tier: DesignationTier;
  designation_confidence: DesignationConfidence;
  flags: string[];
  category_snapshot: Record<string, unknown>;
  public_summary: string;
  /** Internal only — not returned on public/org-safe APIs */
  grading_snapshot: {
    grading_run_id: string | null;
    grading_version: string | null;
    overall_score_band: "not_computed" | "hidden";
  };
};

export type OrgDesignationRow = {
  id: string;
  created_at: string;
  organization_id: string;
  grading_run_id: string | null;
  designation_version: string;
  designation_tier: DesignationTier;
  designation_confidence: DesignationConfidence;
  is_current: boolean;
  public_summary: string | null;
  category_snapshot: Record<string, unknown>;
  flags: string[];
  computed_by: string | null;
};

export type { OrgQualityScoreRow };
