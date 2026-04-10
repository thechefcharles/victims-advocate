/**
 * Domain 1.1 — SupportRequest: data access layer.
 *
 * Raw DB access only. No business logic. No serialization.
 * All functions accept a Supabase admin client — callers are responsible
 * for using service-role client for mutations.
 *
 * Data class: Class A — Restricted.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupportRequestRecord } from "./supportRequestTypes";
import type { SupportRequestStatus } from "@/lib/registry";

const TABLE = "support_requests" as const;

/** Status values that indicate an "inactive" request for one-active-request checks. */
const INACTIVE_STATUSES: SupportRequestStatus[] = [
  "declined",
  "transferred",
  "withdrawn",
  "closed",
];

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Fetches a single support request by ID.
 * Returns null if not found.
 */
export async function getSupportRequestById(
  supabase: SupabaseClient,
  id: string,
): Promise<SupportRequestRecord | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getSupportRequestById: ${error.message}`);
  return (data as SupportRequestRecord | null) ?? null;
}

/**
 * Lists all support requests owned by a given applicant.
 */
export async function listSupportRequestsByApplicant(
  supabase: SupabaseClient,
  applicantId: string,
  filters?: { status?: SupportRequestStatus },
): Promise<SupportRequestRecord[]> {
  let query = supabase
    .from(TABLE)
    .select("*")
    .eq("applicant_id", applicantId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`listSupportRequestsByApplicant: ${error.message}`);
  return (data as SupportRequestRecord[]) ?? [];
}

/**
 * Lists all support requests for a given organization (provider queue).
 */
export async function listSupportRequestsByOrganization(
  supabase: SupabaseClient,
  orgId: string,
  filters?: { status?: SupportRequestStatus },
): Promise<SupportRequestRecord[]> {
  let query = supabase
    .from(TABLE)
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`listSupportRequestsByOrganization: ${error.message}`);
  return (data as SupportRequestRecord[]) ?? [];
}

/**
 * Returns the single active support request for an applicant, or null.
 * Active = status NOT IN (declined, transferred, withdrawn, closed).
 * Used for the one-active-request enforcement at the service layer.
 */
export async function findActiveSupportRequestForApplicant(
  supabase: SupabaseClient,
  applicantId: string,
): Promise<SupportRequestRecord | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("applicant_id", applicantId)
    .not("status", "in", `(${INACTIVE_STATUSES.map((s) => `"${s}"`).join(",")})`)
    .maybeSingle();

  if (error) throw new Error(`findActiveSupportRequestForApplicant: ${error.message}`);
  return (data as SupportRequestRecord | null) ?? null;
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Inserts a new support request row. Returns the created record.
 */
export async function createSupportRequestRecord(
  supabase: SupabaseClient,
  input: {
    applicant_id: string;
    organization_id: string;
    program_id?: string | null;
  },
): Promise<SupportRequestRecord> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      applicant_id: input.applicant_id,
      organization_id: input.organization_id,
      program_id: input.program_id ?? null,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) throw new Error(`createSupportRequestRecord: ${error.message}`);
  return data as SupportRequestRecord;
}

/**
 * Updates a support request row. Uses expectedFromStatus for optimistic concurrency —
 * the update is a no-op if the current status has changed since the caller fetched it.
 * Returns the updated record, or null if the optimistic check failed (status changed).
 */
export async function updateSupportRequestRecord(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Omit<SupportRequestRecord, "id" | "created_at" | "applicant_id">>,
  expectedFromStatus: SupportRequestStatus,
): Promise<SupportRequestRecord | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", expectedFromStatus)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(`updateSupportRequestRecord: ${error.message}`);
  return (data as SupportRequestRecord | null) ?? null;
}

/**
 * Links a support request to a Case (set by Domain 1.2 on acceptance).
 */
export async function linkSupportRequestToCase(
  supabase: SupabaseClient,
  requestId: string,
  caseId: string,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ case_id: caseId, updated_at: new Date().toISOString() })
    .eq("id", requestId);

  if (error) throw new Error(`linkSupportRequestToCase: ${error.message}`);
}
