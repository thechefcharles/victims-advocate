/**
 * Domain 5.3 — Build a DenialCheckInput from an intake session's stored
 * draft_payload + the active StateWorkflowConfig for the applicant's state.
 *
 * Shared by the /api/intake/[id]/denial-check route and by
 * intakeService.submitIntake. Pure except for the state-config fetch.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getStateConfig } from "@/lib/server/stateWorkflows/stateWorkflowConfigService";
import type { DenialCheckInput } from "./denialPreventionService";

export interface SessionForDenialCheck {
  id: string;
  state_code?: string | null;
  draft_payload?: Record<string, unknown> | null;
}

export async function buildDenialCheckInput(
  session: SessionForDenialCheck,
  supabase: SupabaseClient,
): Promise<DenialCheckInput> {
  const payload = (session.draft_payload ?? {}) as Record<string, unknown>;
  const stateCode = String(session.state_code ?? payload.state_code ?? "IL").toUpperCase() as
    | "IL"
    | "IN";
  const config = await getStateConfig(stateCode, supabase);

  const crime = (payload.crime as Record<string, unknown> | undefined) ?? {};
  const applicant = (payload.applicant as Record<string, unknown> | undefined) ?? {};
  const collateral = (payload.collateral as Record<string, unknown> | undefined) ?? {};
  const expenses = (payload.expenses as Record<string, unknown> | undefined) ?? {};
  const documents = (payload.documents as Record<string, unknown> | undefined) ?? {};
  const meta = (payload.meta as Record<string, unknown> | undefined) ?? {};
  const cooperation = (payload.cooperation as Record<string, unknown> | undefined) ?? {};
  const contributory = (payload.contributory as Record<string, unknown> | undefined) ?? {};
  const eligibility = (payload.eligibility as Record<string, unknown> | undefined) ?? {};
  const authorizations = (payload.authorizations as Record<string, unknown> | undefined) ?? {};

  const crimeType = typeof crime.crimeType === "string" ? (crime.crimeType as string) : null;

  return {
    stateCode,
    crimeDate: typeof crime.dateOfCrime === "string" ? (crime.dateOfCrime as string) : null,
    filingDeadlineDays: config.filingDeadlineDays,
    reportDate: typeof crime.reportDate === "string" ? (crime.reportDate as string) : null,
    reportDeadlineDays: config.reportDeadlineDays,
    crimeType,
    policeReportException: crimeType
      ? config.policeReportExceptions.find((e) => e.crimeType === crimeType) ?? null
      : null,
    cooperationAnswered: Boolean(cooperation.answered),
    policeReportNumberProvided: Boolean(crime.policeReportNumber),
    alternateVerificationProvided: Boolean(crime.alternateVerification),
    contributoryConductFlag: Boolean(contributory.flagged),
    crimeCoveredByCvca:
      typeof eligibility.crimeCoveredByCvca === "boolean"
        ? (eligibility.crimeCoveredByCvca as boolean)
        : true,
    filerType: typeof applicant.filerType === "string" ? (applicant.filerType as string) : null,
    allowedFilerTypes: config.filerTypes,
    hasInsuranceClaim: Boolean(collateral.hasInsuranceClaim),
    hasMedicaidClaim: Boolean(collateral.hasMedicaidClaim),
    hasWorkerCompClaim: Boolean(collateral.hasWorkerCompClaim),
    collateralCoordinationDocumented: Boolean(collateral.coordinationDocumented),
    expenseCategoriesClaimed: Array.isArray(expenses.claimed)
      ? (expenses.claimed as string[])
      : [],
    documentedExpenseCategories: Array.isArray(expenses.documented)
      ? (expenses.documented as string[])
      : [],
    crimeDocUploaded: Boolean(documents.crime),
    requiredFieldsMissing: Array.isArray(meta.requiredFieldsMissing)
      ? (meta.requiredFieldsMissing as string[])
      : [],
    ineligibleExpenseCategoriesClaimed: Array.isArray(expenses.ineligible)
      ? (expenses.ineligible as string[])
      : [],
    disqualifyingFelonyFlag: Boolean(applicant.disqualifyingFelony),
    requiresSubrogation: config.requiresSubrogationAgreement,
    subrogationSigned: Boolean(authorizations.subrogationSigned),
    requiresReleaseOfInfo: config.requiresReleaseOfInformation,
    releaseOfInfoSigned: Boolean(authorizations.releaseOfInfoSigned),
  };
}

/** Extract the list of missing items used to drive reminder scheduling. */
export function extractMissingItems(input: DenialCheckInput): string[] {
  const items: string[] = [];
  if (!input.crimeDocUploaded) items.push("crime_documentation");
  for (const cat of input.expenseCategoriesClaimed) {
    if (!input.documentedExpenseCategories.includes(cat)) {
      items.push(`expense_doc:${cat}`);
    }
  }
  if (input.requiresSubrogation && !input.subrogationSigned) {
    items.push("subrogation_agreement_signature");
  }
  if (input.requiresReleaseOfInfo && !input.releaseOfInfoSigned) {
    items.push("release_of_information_signature");
  }
  for (const field of input.requiredFieldsMissing) {
    items.push(`required_field:${field}`);
  }
  return items;
}
