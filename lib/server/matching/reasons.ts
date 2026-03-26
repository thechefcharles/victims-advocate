/**
 * Phase B: Human-readable match reasons and flags (deterministic).
 */

import type { MatchingInput, OrgRowForMatching } from "./types";

const SERVICE_LABELS: Record<string, string> = {
  victim_compensation: "victim compensation support",
  legal_aid: "legal aid",
  therapy: "counseling or therapy",
  case_management: "case management",
  housing_support: "housing support",
  emergency_funds: "emergency financial assistance",
  hospital_advocacy: "hospital or medical advocacy",
};

const POP_LABELS: Record<string, string> = {
  sexual_assault: "victims of sexual assault",
  domestic_violence: "domestic violence victims",
  homicide_survivors: "homicide victims and families",
  spanish_speaking: "Spanish-speaking clients",
  children: "children and families",
  immigrant_clients: "immigrant clients",
};

export function buildServiceReasons(overlap: string[]): string[] {
  const out: string[] = [];
  for (const s of overlap) {
    const label = SERVICE_LABELS[s] ?? s.replace(/_/g, " ");
    out.push(`Offers ${label}`);
  }
  return out;
}

export function buildGeographyReason(params: {
  stateMatch: boolean;
  viaVirtual: boolean;
  stateKnown: boolean;
}): string[] {
  if (params.viaVirtual) {
    return ["Offers virtual services"];
  }
  if (params.stateMatch && params.stateKnown) {
    return ["Serves your area"];
  }
  if (!params.stateKnown) {
    return [];
  }
  return [];
}

export function buildLanguageReasons(
  org: OrgRowForMatching,
  preferred: string | null
): { reasons: string[]; match: boolean; unknown: boolean } {
  if (!preferred) {
    return { reasons: [], match: false, unknown: true };
  }
  const langs = (org.languages || []).map((l) => l.toLowerCase());
  if (langs.length === 0) {
    return {
      reasons: [],
      match: false,
      unknown: true,
    };
  }
  if (langs.includes(preferred)) {
    const name =
      preferred === "es"
        ? "Spanish"
        : preferred === "en"
          ? "English"
          : preferred.toUpperCase();
    return {
      reasons: [`Provides services in ${name}`],
      match: true,
      unknown: false,
    };
  }
  return { reasons: [], match: false, unknown: false };
}

export function buildCapacityReasons(org: OrgRowForMatching): {
  reasons: string[];
  signal: string;
} {
  const reasons: string[] = [];
  let signal = org.capacity_status || "unknown";
  if (org.accepting_clients) {
    reasons.push("Currently accepting clients");
    signal = "accepting";
  } else if (org.capacity_status === "limited") {
    reasons.push("Limited capacity reported");
    signal = "limited";
  } else if (org.capacity_status === "waitlist") {
    reasons.push("Waitlist reported — reach out to confirm");
    signal = "waitlist";
  }
  return { reasons, signal };
}

export function buildAccessibilityReasons(
  org: OrgRowForMatching,
  needed: string[]
): { matched: string[]; reasons: string[] } {
  const orgSet = new Set((org.accessibility_features || []).map((x) => x.toLowerCase()));
  const matched: string[] = [];
  const reasons: string[] = [];
  for (const n of needed) {
    if (orgSet.has(n.toLowerCase())) {
      matched.push(n);
      if (n === "wheelchair_access") reasons.push("Wheelchair access available");
      if (n === "interpreters") reasons.push("Interpreter or accessibility support available");
      if (n === "transportation_support") reasons.push("Transportation-related support available");
    }
  }
  if (orgSet.has("virtual_services") && needed.length === 0) {
    reasons.push("Offers virtual services");
  }
  return { matched, reasons };
}

export function buildSpecialPopulationReasons(
  org: OrgRowForMatching,
  flags: string[]
): string[] {
  const orgSet = new Set((org.special_populations || []).map((x) => x.toLowerCase()));
  const out: string[] = [];
  for (const f of flags) {
    if (orgSet.has(f.toLowerCase())) {
      const label = POP_LABELS[f] ?? f.replace(/_/g, " ");
      out.push(`Supports ${label}`);
    }
  }
  return out;
}

export function buildSparseIntakeFlag(input: MatchingInput): string | null {
  return input.intake_sparse
    ? "More information in your application may improve recommendations"
    : null;
}

export function buildProfileIncompleteFlag(completeness: number): string | null {
  if (completeness < 0.35) {
    return "Organization profile is incomplete — treat as a tentative match";
  }
  return null;
}

export function buildCoverageUnclearFlag(coverageDefined: boolean): string | null {
  if (!coverageDefined) {
    return "Coverage details are limited";
  }
  return null;
}

/** Phase F: Non-comparative designation context for matches (no “rated”, “top”, etc.). */
export function designationMatchReasonText(
  tier: "comprehensive" | "established" | "foundational" | "insufficient_data"
): string | null {
  switch (tier) {
    case "comprehensive":
      return "Shows strong structured readiness in NxtStps";
    case "established":
      return "Has an established organization profile and workflow presence";
    case "foundational":
      return "More profile and workflow evidence is available for this organization";
    default:
      return null;
  }
}

/** Optional calm flag when designation confidence is low — not punitive. */
export function buildLimitedDesignationEvidenceFlag(params: {
  hasDesignationRow: boolean;
  confidence: string | null;
  tier: string | null;
}): string | null {
  if (!params.hasDesignationRow) return null;
  if (params.confidence !== "low") return null;
  if (params.tier === "insufficient_data") return null;
  return "Limited platform evidence on file for this organization — fit and services still drive this suggestion";
}
