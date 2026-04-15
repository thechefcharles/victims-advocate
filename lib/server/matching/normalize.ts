/**
 * Phase B: Map compensation application + case row → MatchingInput (deterministic, no guessing).
 */

import type { LegacyIntakePayload } from "@/lib/archive/compensationSchema.legacy";
import type { MatchingInput } from "./types";

const SERVICE_KEYS = new Set([
  "victim_compensation",
  "legal_aid",
  "therapy",
  "case_management",
  "housing_support",
  "emergency_funds",
  "hospital_advocacy",
]);

function normalizeState(s: string | undefined | null): string | null {
  if (!s || typeof s !== "string") return null;
  const u = s.trim().toUpperCase();
  return u.length === 2 && /^[A-Z]{2}$/.test(u) ? u : null;
}

function normalizePreferredLanguage(contact: LegacyIntakePayload["contact"]): string | null {
  if (!contact) return null;
  const raw = contact.preferredLanguage?.trim();
  if (raw) {
    const t = raw.toLowerCase();
    const map: Record<string, string> = {
      english: "en",
      spanish: "es",
      french: "fr",
      arabic: "ar",
      chinese: "zh",
      vietnamese: "vi",
      korean: "ko",
      tagalog: "tl",
    };
    if (map[t]) return map[t];
    if (/^[a-z]{2}(-[a-z]{2,4})?$/.test(t)) return t;
    return null;
  }
  if (contact.prefersEnglish === true) return "en";
  return null;
}

function collectServicesFromLosses(losses: LegacyIntakePayload["losses"]): string[] {
  const out = new Set<string>();
  if (!losses) return [];
  if (losses.counseling) out.add("therapy");
  if (losses.medicalHospital || losses.dental) out.add("hospital_advocacy");
  if (losses.relocationCosts || losses.temporaryLodging) out.add("housing_support");
  if (losses.legalFees) out.add("legal_aid");
  if (losses.funeralBurial || losses.lossOfSupport || losses.headstone) {
    out.add("emergency_funds");
  }
  const many =
    [
      losses.medicalHospital,
      losses.counseling,
      losses.relocationCosts,
      losses.lossOfEarnings,
      losses.funeralBurial,
    ].filter(Boolean).length >= 3;
  if (many) out.add("case_management");
  return [...out].filter((s) => SERVICE_KEYS.has(s));
}

function collectAccessibilityNeeds(app: LegacyIntakePayload): string[] {
  const needs = new Set<string>();
  if (app.victim?.hasDisability && app.victim.disabilityType === "physical") {
    needs.add("wheelchair_access");
  }
  if (app.losses?.accessibilityCosts) {
    needs.add("transportation_support");
  }
  if (app.losses?.hearingAids) {
    needs.add("interpreters");
  }
  return [...needs];
}

function collectSpecialPopulations(app: LegacyIntakePayload): string[] {
  const flags = new Set<string>();
  if (app.crime?.sexualAssaultKitPerformed) flags.add("sexual_assault");
  if (app.protectionAndCivil?.hasOrderOfProtection) flags.add("domestic_violence");
  if (app.losses?.funeralBurial || app.losses?.lossOfSupport) flags.add("homicide_survivors");
  const ethnicity = app.victim?.ethnicity?.toLowerCase() ?? "";
  if (ethnicity.includes("hispanic") || ethnicity.includes("latino")) {
    flags.add("spanish_speaking");
  }
  return [...flags];
}

export function buildMatchingInputFromApplication(
  app: LegacyIntakePayload | null,
  caseExtras?: { state_code?: string | null }
): MatchingInput {
  const services = new Set<string>(["victim_compensation"]);
  if (app) {
    for (const s of collectServicesFromLosses(app.losses)) services.add(s);
  }

  const stateFromVictim = normalizeState(app?.victim?.state);
  const stateFromApplicant =
    !app?.applicant?.isSameAsVictim ? normalizeState(app?.applicant?.state) : null;
  const stateFromCase = normalizeState(caseExtras?.state_code ?? undefined);
  const state_code = stateFromVictim ?? stateFromApplicant ?? stateFromCase;

  const county =
    app?.crime?.crimeCounty?.trim().toLowerCase() || null;
  const zip =
    app?.victim?.zip?.trim().replace(/\D/g, "").slice(0, 5) || null;
  if (zip && zip.length < 5) {
    /* keep short zips as-is for matching attempt */
  }

  const preferred_language = app ? normalizePreferredLanguage(app.contact) : null;
  const needs_accessibility_features = app ? collectAccessibilityNeeds(app) : [];
  const special_population_flags = app ? collectSpecialPopulations(app) : [];

  const signalCount =
    services.size +
    (state_code ? 1 : 0) +
    (preferred_language ? 1 : 0) +
    needs_accessibility_features.length +
    special_population_flags.length;

  return {
    service_types_needed: [...services],
    preferred_language,
    state_code,
    county,
    zip_code: app?.victim?.zip?.trim() || null,
    virtual_ok: true,
    needs_accessibility_features,
    special_population_flags,
    urgent: null,
    intake_sparse: signalCount < 4,
  };
}

export function parseCaseApplication(raw: unknown): LegacyIntakePayload | null {
  if (!raw) return null;
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return raw as LegacyIntakePayload;
  }
  if (typeof raw === "string") {
    try {
      const once = JSON.parse(raw);
      if (typeof once === "object" && once) return once as LegacyIntakePayload;
      if (typeof once === "string") {
        const twice = JSON.parse(once);
        if (typeof twice === "object" && twice) return twice as LegacyIntakePayload;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export function buildMatchingInputFromCaseRow(caseRow: Record<string, unknown>): MatchingInput {
  const app = parseCaseApplication(caseRow.application);
  const state_code = (caseRow.state_code as string) || null;
  return buildMatchingInputFromApplication(app, { state_code });
}
