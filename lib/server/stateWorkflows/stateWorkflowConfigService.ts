/**
 * Domain 2.2 — State workflow config service.
 *
 * Single entrypoint for reading the active StateWorkflowConfig for a given
 * state. The Master System Document spec ban on `if (stateCode === "IL")`
 * branches in application code is enforced by routing every state-specific
 * decision through this service: callers ask the config for a field value,
 * never for an opaque state code.
 *
 * Caching: active configs change rarely (governed changes go through Domain
 * 7.1 ChangeRequest). The in-process cache expires after 5 minutes so
 * publishes propagate within one cache window without a restart.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubmissionMethod = "online" | "paper_mail_only" | "email" | "hybrid";
export type AdvocateModel = "facilitator" | "filer" | "none";
export type ImmigrationRestriction =
  | "none"
  | "citizen_or_eligible_alien"
  | "lawful_presence";

export interface PoliceReportException {
  crimeType: string;
  alternateVerification: string;
  effectiveDate?: string;
}

export interface StateWorkflowConfig {
  id: string;
  stateCode: string;
  programName: string;
  adminAgency: string;
  statute: string | null;
  submissionMethod: SubmissionMethod;
  submissionAddress: string | null;
  advocateModel: AdvocateModel;
  advocatePortal: boolean;
  policeReportRequired: boolean;
  policeReportExceptions: PoliceReportException[];
  filerTypes: string[];
  separateApplicationRequired: string[];
  requiresSubrogationAgreement: boolean;
  requiresReleaseOfInformation: boolean;
  authorizationExpiryYears: number | null;
  goodSamaritanEligible: boolean;
  immigrationRestriction: ImmigrationRestriction;
  filingDeadlineDays: number | null;
  reportDeadlineDays: number | null;
  maxAwardCents: number | null;
  maxFuneralAwardCents: number | null;
  generatedDocType: string | null;
  versionNumber: number;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000;
interface CacheEntry {
  config: StateWorkflowConfig;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

function rowToConfig(row: Record<string, unknown>): StateWorkflowConfig {
  return {
    id: String(row.id),
    stateCode: String(row.state_code),
    programName: String(row.program_name ?? ""),
    adminAgency: String(row.admin_agency ?? ""),
    statute: row.statute != null ? String(row.statute) : null,
    submissionMethod: String(row.submission_method ?? "online") as SubmissionMethod,
    submissionAddress: row.submission_address != null ? String(row.submission_address) : null,
    advocateModel: String(row.advocate_model ?? "none") as AdvocateModel,
    advocatePortal: Boolean(row.advocate_portal),
    policeReportRequired: row.police_report_required !== false,
    policeReportExceptions: Array.isArray(row.police_report_exceptions)
      ? (row.police_report_exceptions as PoliceReportException[])
      : [],
    filerTypes: Array.isArray(row.filer_types) ? (row.filer_types as string[]) : [],
    separateApplicationRequired: Array.isArray(row.separate_application_required)
      ? (row.separate_application_required as string[])
      : [],
    requiresSubrogationAgreement: Boolean(row.requires_subrogation_agreement),
    requiresReleaseOfInformation: Boolean(row.requires_release_of_information),
    authorizationExpiryYears:
      row.authorization_expiry_years != null ? Number(row.authorization_expiry_years) : null,
    goodSamaritanEligible: Boolean(row.good_samaritan_eligible),
    immigrationRestriction: String(
      row.immigration_restriction ?? "none",
    ) as ImmigrationRestriction,
    filingDeadlineDays:
      row.filing_deadline_days != null ? Number(row.filing_deadline_days) : null,
    reportDeadlineDays:
      row.report_deadline_days != null ? Number(row.report_deadline_days) : null,
    maxAwardCents: row.max_award_cents != null ? Number(row.max_award_cents) : null,
    maxFuneralAwardCents:
      row.max_funeral_award_cents != null ? Number(row.max_funeral_award_cents) : null,
    generatedDocType: row.generated_doc_type != null ? String(row.generated_doc_type) : null,
    versionNumber: row.version_number != null ? Number(row.version_number) : 1,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getStateConfig(
  stateCode: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<StateWorkflowConfig> {
  const key = stateCode.toUpperCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.config;

  const { data, error } = await supabase
    .from("state_workflow_configs")
    .select("*")
    .eq("state_code", key)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Failed to load state workflow config.", undefined, 500);
  }
  if (!data) {
    throw new AppError(
      "NOT_FOUND",
      `No active StateWorkflowConfig for state '${key}'.`,
      undefined,
      404,
    );
  }
  const config = rowToConfig(data as Record<string, unknown>);
  cache.set(key, { config, expiresAt: Date.now() + CACHE_TTL_MS });
  return config;
}

export async function getFilerTypes(stateCode: string): Promise<string[]> {
  const config = await getStateConfig(stateCode);
  return config.filerTypes;
}

export async function requiresSeparateApplication(
  stateCode: string,
  filerType: string,
): Promise<boolean> {
  const config = await getStateConfig(stateCode);
  return config.separateApplicationRequired.includes(filerType);
}

export async function getPoliceReportException(
  stateCode: string,
  crimeType: string,
): Promise<PoliceReportException | null> {
  const config = await getStateConfig(stateCode);
  return (
    config.policeReportExceptions.find((ex) => ex.crimeType === crimeType) ?? null
  );
}

/**
 * Test / admin helper — invalidate the in-process cache. Call after publishing
 * a new active config so readers see it immediately.
 */
export function invalidateStateConfigCache(stateCode?: string): void {
  if (stateCode) cache.delete(stateCode.toUpperCase());
  else cache.clear();
}
