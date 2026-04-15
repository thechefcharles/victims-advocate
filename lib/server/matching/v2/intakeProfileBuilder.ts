/**
 * Domain 3.4 — V2 matching: IntakeMatchProfile builder.
 *
 * Reads a case + its linked intake session and returns the IntakeMatchProfile
 * shape that rankOrgs consumes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type { IntakeMatchProfile } from "./matchingTypes";

export async function buildIntakeMatchProfile(
  caseId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<IntakeMatchProfile> {
  const { data: caseRow, error: caseErr } = await supabase
    .from("cases")
    .select("id, application, state_code")
    .eq("id", caseId)
    .maybeSingle();
  if (caseErr) throw new AppError("INTERNAL", "Failed to load case.", undefined, 500);
  if (!caseRow) throw new AppError("NOT_FOUND", "Case not found.", undefined, 404);

  const app = ((caseRow as { application?: Record<string, unknown> }).application ?? {}) as Record<
    string,
    unknown
  >;
  const victim = (app.victim as Record<string, unknown> | undefined) ?? {};
  const crime = (app.crime as Record<string, unknown> | undefined) ?? {};
  const contact = (app.contact as Record<string, unknown> | undefined) ?? {};
  const losses = (app.losses as Record<string, unknown> | undefined) ?? {};

  const serviceTypesNeeded: string[] = [];
  const LOSS_TO_SERVICE: Record<string, string> = {
    medicalHospital: "medical",
    counseling: "counseling",
    lossOfEarnings: "employment_support",
    funeralBurial: "funeral_support",
    relocation: "relocation",
  };
  for (const [key, val] of Object.entries(losses)) {
    if (val === true && LOSS_TO_SERVICE[key]) {
      serviceTypesNeeded.push(LOSS_TO_SERVICE[key]);
    }
  }
  if (serviceTypesNeeded.length === 0) serviceTypesNeeded.push("case_management");

  const languagePreference =
    typeof contact.preferredLanguage === "string" && contact.preferredLanguage.trim().length > 0
      ? (contact.preferredLanguage as string)
      : "en";
  const requiresLanguageMatch = contact.prefersEnglish === false;

  return {
    serviceTypesNeeded,
    crimeType: typeof crime.crimeType === "string" ? (crime.crimeType as string) : null,
    locationZip: typeof victim.zip === "string" ? (victim.zip as string) : null,
    locationCounty: typeof victim.county === "string" ? (victim.county as string) : null,
    radiusKm: 25,
    languagePreference,
    requiresLanguageMatch,
  };
}
