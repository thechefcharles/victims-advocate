/**
 * Phase F: Public-safe match payload for APIs (no internal boost/tie ordinals).
 */

import type { MatchEvaluation } from "./types";
import type { OrganizationMatchRunRow } from "./types";

export type OrganizationMatchApiPayload = {
  organization_id: string;
  organization_name: string;
  match_score: number;
  match_tier: string;
  strong_match: boolean;
  possible_match: boolean;
  limited_match: boolean;
  reasons: string[];
  flags: string[];
  service_overlap: string[];
  language_match: boolean;
  accessibility_match: string[];
  capacity_signal: string | null;
  virtual_ok: boolean | null;
  designation_tier: string | null;
  designation_confidence: string | null;
  designation_summary: string | null;
  designation_influenced_match: boolean;
  designation_reason: string | null;
};

export function matchEvaluationToApi(m: MatchEvaluation): OrganizationMatchApiPayload {
  return {
    organization_id: m.organization_id,
    organization_name: m.organization_name,
    match_score: m.match_score,
    match_tier: m.match_tier,
    strong_match: m.strong_match,
    possible_match: m.possible_match,
    limited_match: m.limited_match,
    reasons: m.reasons,
    flags: m.flags,
    service_overlap: m.service_overlap,
    language_match: m.language_match,
    accessibility_match: m.accessibility_match,
    capacity_signal: m.capacity_signal,
    virtual_ok: m.virtual_ok,
    designation_tier: m.designation_tier,
    designation_confidence: m.designation_confidence,
    designation_summary: m.designation_summary,
    designation_influenced_match: m.designation_influenced_match,
    designation_reason: m.designation_reason,
  };
}

export function matchRunRowToApi(m: OrganizationMatchRunRow): OrganizationMatchApiPayload {
  const meta = m.metadata ?? {};
  return {
    organization_id: m.organization_id,
    organization_name: m.organization_name,
    match_score: m.match_score,
    match_tier: m.match_tier,
    strong_match: m.strong_match,
    possible_match: m.possible_match,
    limited_match: m.limited_match,
    reasons: m.reasons,
    flags: m.flags,
    service_overlap: (meta.service_overlap as string[]) ?? [],
    language_match: Boolean(meta.language_match),
    accessibility_match: (meta.accessibility_match as string[]) ?? [],
    capacity_signal: (meta.capacity_signal as string | null) ?? null,
    virtual_ok: (meta.virtual_ok as boolean | null) ?? null,
    designation_tier: m.designation_tier,
    designation_confidence: m.designation_confidence,
    designation_summary: m.designation_summary,
    designation_influenced_match: m.designation_influenced_match,
    designation_reason: m.designation_reason,
  };
}
