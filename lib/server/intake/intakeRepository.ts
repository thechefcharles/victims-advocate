/**
 * Domain 2.1 — Intake: data access layer.
 *
 * Pure DB I/O. No business logic. No serialization. No policy checks.
 * All functions accept a Supabase client — callers use service-role for mutations.
 *
 * Data class: Class A — Restricted.
 *
 * Dual-write note: updateDraftPayload() optionally also patches cases.application
 * (the legacy intake store) so that the legacy intake page continues to read a
 * consistent draft. This shim is removed when the legacy page is rewritten.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  IntakeSessionRecord,
  IntakeSubmissionRecord,
  IntakeAmendmentRecord,
  IntakeSessionStatus,
  CreateIntakeSessionInput,
} from "./intakeTypes";

const SESSIONS_TABLE = "intake_sessions" as const;
const SUBMISSIONS_TABLE = "intake_submissions" as const;
const AMENDMENTS_TABLE = "intake_amendments" as const;
const CASES_TABLE = "cases" as const;

// ---------------------------------------------------------------------------
// Sessions — read
// ---------------------------------------------------------------------------

export async function getSessionById(
  supabase: SupabaseClient,
  id: string,
): Promise<IntakeSessionRecord | null> {
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getSessionById: ${error.message}`);
  return (data as IntakeSessionRecord | null) ?? null;
}

export async function getSessionsByOwner(
  supabase: SupabaseClient,
  ownerUserId: string,
  filters?: { status?: IntakeSessionStatus },
): Promise<IntakeSessionRecord[]> {
  let query = supabase
    .from(SESSIONS_TABLE)
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(`getSessionsByOwner: ${error.message}`);
  return (data as IntakeSessionRecord[]) ?? [];
}

// ---------------------------------------------------------------------------
// Sessions — write
// ---------------------------------------------------------------------------

export async function insertSession(
  supabase: SupabaseClient,
  input: CreateIntakeSessionInput & { owner_user_id: string },
): Promise<IntakeSessionRecord> {
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .insert({
      owner_user_id: input.owner_user_id,
      case_id: input.case_id ?? null,
      support_request_id: input.support_request_id ?? null,
      organization_id: input.organization_id ?? null,
      state_code: input.state_code,
      status: "draft",
      draft_payload: {},
      intake_schema_version: "v1",
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`insertSession: ${error?.message ?? "no row returned"}`);
  return data as IntakeSessionRecord;
}

/**
 * Updates draft_payload on a session. If caseApplicationPatch is provided AND
 * the session has a case_id, also writes to cases.application as part of the
 * legacy dual-write contract (Decision 2 — saveIntakeDraft must keep both stores in sync).
 *
 * Failure of the cases.application sync is logged but does NOT roll back the
 * primary intake_sessions update — the canonical store is intake_sessions.
 */
export async function updateDraftPayload(
  supabase: SupabaseClient,
  id: string,
  draftPayload: Record<string, unknown>,
  caseApplicationPatch?: { caseId: string; payload: Record<string, unknown> },
): Promise<IntakeSessionRecord> {
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .update({ draft_payload: draftPayload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) throw new Error(`updateDraftPayload: ${error?.message ?? "no row returned"}`);

  // Dual-write: best-effort sync to legacy cases.application column.
  if (caseApplicationPatch) {
    const { error: caseErr } = await supabase
      .from(CASES_TABLE)
      .update({ application: caseApplicationPatch.payload })
      .eq("id", caseApplicationPatch.caseId);
    if (caseErr) {
      // Log via console.warn — logger module is service-tier and not all callers have one.
      // The intake_sessions row is the canonical store; the legacy column is best-effort.
      console.warn(
        `[intakeRepository] dual-write to cases.application failed for case ${caseApplicationPatch.caseId}: ${caseErr.message}`,
      );
    }
  }

  return data as IntakeSessionRecord;
}

export async function updateSessionStatus(
  supabase: SupabaseClient,
  id: string,
  status: IntakeSessionStatus,
): Promise<IntakeSessionRecord> {
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) throw new Error(`updateSessionStatus: ${error?.message ?? "no row returned"}`);
  return data as IntakeSessionRecord;
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export async function insertSubmission(
  supabase: SupabaseClient,
  input: {
    session_id: string;
    case_id: string | null;
    organization_id: string | null;
    owner_user_id: string;
    submitted_payload: Record<string, unknown>;
    intake_schema_version: string;
    state_code: "IL" | "IN";
    submitted_by_user_id: string | null;
  },
): Promise<IntakeSubmissionRecord> {
  const { data, error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .insert(input)
    .select("*")
    .single();

  if (error || !data) throw new Error(`insertSubmission: ${error?.message ?? "no row returned"}`);
  return data as IntakeSubmissionRecord;
}

export async function getSubmissionById(
  supabase: SupabaseClient,
  id: string,
): Promise<IntakeSubmissionRecord | null> {
  const { data, error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getSubmissionById: ${error.message}`);
  return (data as IntakeSubmissionRecord | null) ?? null;
}

export async function getSubmissionBySessionId(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<IntakeSubmissionRecord | null> {
  const { data, error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw new Error(`getSubmissionBySessionId: ${error.message}`);
  return (data as IntakeSubmissionRecord | null) ?? null;
}

// ---------------------------------------------------------------------------
// Amendments
// ---------------------------------------------------------------------------

export async function insertAmendment(
  supabase: SupabaseClient,
  input: {
    submission_id: string;
    field_key: string;
    previous_value: unknown;
    new_value: unknown;
    reason: string | null;
    amended_by_user_id: string;
  },
): Promise<IntakeAmendmentRecord> {
  const { data, error } = await supabase
    .from(AMENDMENTS_TABLE)
    .insert(input)
    .select("*")
    .single();

  if (error || !data) throw new Error(`insertAmendment: ${error?.message ?? "no row returned"}`);
  return data as IntakeAmendmentRecord;
}

export async function listAmendmentsBySubmission(
  supabase: SupabaseClient,
  submissionId: string,
): Promise<IntakeAmendmentRecord[]> {
  const { data, error } = await supabase
    .from(AMENDMENTS_TABLE)
    .select("*")
    .eq("submission_id", submissionId)
    .order("amended_at", { ascending: true });

  if (error) throw new Error(`listAmendmentsBySubmission: ${error.message}`);
  return (data as IntakeAmendmentRecord[]) ?? [];
}
