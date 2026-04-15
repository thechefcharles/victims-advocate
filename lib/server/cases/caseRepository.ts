/**
 * Domain 1.2 — Case: data access layer.
 *
 * Raw DB access only. No business logic. No serialization.
 * All functions accept a Supabase client — callers use service-role for mutations.
 *
 * Data class: Class A — Restricted.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaseRecord } from "./caseTypes";
import type { CaseStatus } from "@nxtstps/registry";

const TABLE = "cases" as const;

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Fetches a single case by ID. Returns null if not found. */
export async function getCaseRecordById(
  supabase: SupabaseClient,
  id: string,
): Promise<CaseRecord | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getCaseRecordById: ${error.message}`);
  return (data as CaseRecord | null) ?? null;
}

/** Lists all cases owned by a given applicant. */
export async function listCasesByOwner(
  supabase: SupabaseClient,
  ownerUserId: string,
  filters?: { status?: CaseStatus },
): Promise<CaseRecord[]> {
  let query = supabase
    .from(TABLE)
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`listCasesByOwner: ${error.message}`);
  return (data as CaseRecord[]) ?? [];
}

/** Lists all cases belonging to an organization. */
export async function listCasesByOrganization(
  supabase: SupabaseClient,
  orgId: string,
  filters?: { status?: CaseStatus },
): Promise<CaseRecord[]> {
  let query = supabase
    .from(TABLE)
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`listCasesByOrganization: ${error.message}`);
  return (data as CaseRecord[]) ?? [];
}

/** Lists all cases assigned to a specific advocate in an org. */
export async function listCasesByAdvocate(
  supabase: SupabaseClient,
  orgId: string,
  advocateId: string,
  filters?: { status?: CaseStatus },
): Promise<CaseRecord[]> {
  let query = supabase
    .from(TABLE)
    .select("*")
    .eq("organization_id", orgId)
    .eq("assigned_advocate_id", advocateId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`listCasesByAdvocate: ${error.message}`);
  return (data as CaseRecord[]) ?? [];
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/** Inserts a new case row. Returns the created record. */
export async function insertCaseRecord(
  supabase: SupabaseClient,
  input: {
    owner_user_id: string;
    organization_id: string;
    program_id?: string | null;
    support_request_id?: string | null;
  },
): Promise<CaseRecord> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      owner_user_id: input.owner_user_id,
      organization_id: input.organization_id,
      program_id: input.program_id ?? null,
      support_request_id: input.support_request_id ?? null,
      status: "open" satisfies CaseStatus,
    })
    .select("*")
    .single();

  if (error) throw new Error(`createCaseRecord: ${error.message}`);
  return data as CaseRecord;
}

/**
 * Updates a case row with optimistic concurrency — only succeeds if the current
 * status matches expectedFromStatus. Returns the updated record or null on race.
 */
export async function updateCaseRecord(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Omit<CaseRecord, "id" | "created_at" | "owner_user_id">>,
  expectedFromStatus: CaseStatus,
): Promise<CaseRecord | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", expectedFromStatus)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(`updateCaseRecord: ${error.message}`);
  return (data as CaseRecord | null) ?? null;
}

/** Updates non-status mutable fields (no optimistic concurrency needed). */
export async function updateCaseFields(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Omit<CaseRecord, "id" | "created_at" | "owner_user_id" | "status">>,
): Promise<CaseRecord | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(`updateCaseFields: ${error.message}`);
  return (data as CaseRecord | null) ?? null;
}
