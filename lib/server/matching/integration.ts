/**
 * Phase F: Apply designation as a soft signal after Phase B fit scoring.
 */

import type { OrgDesignationRow } from "@/lib/server/designations/types";
import type { MatchEvaluation } from "./types";
import {
  computeDesignationMatchPolicy,
  designationTieBreakOrdinal,
} from "./designationPolicy";
import { DESIGNATION_POLICY_VERSION } from "./config";
import { buildLimitedDesignationEvidenceFlag } from "./reasons";
import { rankMatchesWithDesignation } from "./rank";

export type DesignationIntegrationMeta = {
  policy_version: string;
  designations_loaded: number;
  orgs_considered: number;
};

export function integrateDesignationIntoMatches(
  evaluations: MatchEvaluation[],
  designationByOrgId: Map<string, OrgDesignationRow>
): {
  matches: MatchEvaluation[];
  meta: DesignationIntegrationMeta;
} {
  const enriched: MatchEvaluation[] = evaluations.map((ev) => {
    const row = designationByOrgId.get(ev.organization_id) ?? null;
    const policy = computeDesignationMatchPolicy(row, ev);
    const fitScore = ev.match_score;
    const integratedScore = Math.min(100, Math.round(fitScore + policy.boostPoints));

    const designation_tier = row?.designation_tier ?? null;
    const designation_confidence = row?.designation_confidence ?? null;
    const designation_summary = row?.public_summary ?? null;
    const designation_influenced_match = policy.scoreInfluenced;
    const designation_reason = policy.reason;

    const limFlag = buildLimitedDesignationEvidenceFlag({
      hasDesignationRow: Boolean(row),
      confidence: designation_confidence,
      tier: designation_tier,
    });
    const flags = limFlag && !ev.flags.includes(limFlag) ? [...ev.flags, limFlag] : [...ev.flags];

    return {
      ...ev,
      match_score: integratedScore,
      fit_match_score: fitScore,
      reasons: [...ev.reasons],
      flags,
      designation_tier,
      designation_confidence,
      designation_summary,
      designation_influenced_match,
      designation_reason,
      designation_boost_points: policy.boostPoints,
      designation_tie_ordinal: designationTieBreakOrdinal(row),
    };
  });

  const ranked = rankMatchesWithDesignation(enriched);
  return {
    matches: ranked,
    meta: {
      policy_version: DESIGNATION_POLICY_VERSION,
      designations_loaded: designationByOrgId.size,
      orgs_considered: evaluations.length,
    },
  };
}
