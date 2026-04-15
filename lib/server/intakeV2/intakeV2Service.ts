/**
 * Domain 2.5 — intake-v2 session service.
 *
 * Owns CRUD on `intake_v2_sessions`. Submit is an adapter that — for Phase D —
 * marks the v2 session as `submitted` and emits a trust signal. Phase E will
 * wire a full mapper from flat field_key answers into the legacy
 * legacy intake payload shape and call `intakeService.submitIntake` against
 * a paired `intake_sessions` row.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { getActiveCvcFormTemplate } from "@/lib/server/cvcForms/cvcFormRepository";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { AuthContext } from "@/lib/server/auth";

export type IntakeV2Status = "draft" | "submitted" | "abandoned";

export interface IntakeV2Session {
  id: string;
  owner_user_id: string;
  template_id: string | null;
  state_code: string;
  filer_type: string;
  answers: Record<string, unknown>;
  answers_locale: "en" | "es";
  answers_en: Record<string, unknown> | null;
  signed_at: string | null;
  case_id: string | null;
  completed_sections: string[];
  current_section: string | null;
  status: IntakeV2Status;
  submitted_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Synthetic field_keys that represent the Section 7 certification gate. When
 * all three are filled we stamp `signed_at` (once, immutable). Kept in the
 * service layer so the PATCH path can detect completion without the client
 * needing to call a separate "sign" endpoint.
 */
const CERT_FIELD_KEYS = [
  "cert_subrogation_acknowledged",
  "cert_release_authorized",
  "cert_typed_signature",
] as const;

function certificationComplete(answers: Record<string, unknown>): boolean {
  const sub = answers.cert_subrogation_acknowledged === true;
  const rel = answers.cert_release_authorized === true;
  const sig = typeof answers.cert_typed_signature === "string"
    && answers.cert_typed_signature.trim().length > 0;
  return sub && rel && sig;
}

// The key list above is exported for UI / tests that need to know which
// answer slots gate signing. Re-export pattern (not a side-effect import)
// keeps it tree-shakable.
export const CERTIFICATION_FIELD_KEYS: readonly string[] = CERT_FIELD_KEYS;

function ensureOwner(ctx: AuthContext, session: IntakeV2Session): void {
  if (ctx.isAdmin) return;
  if (session.owner_user_id !== ctx.userId) {
    throw new AppError("FORBIDDEN", "Not your session.", undefined, 403);
  }
}

export async function createIntakeV2Session(
  ctx: AuthContext,
  input: {
    stateCode: string;
    filerType: string;
    answersLocale?: "en" | "es";
    caseId?: string | null;
  },
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<IntakeV2Session> {
  const code = (input.stateCode ?? "").trim().toUpperCase();
  const filer = (input.filerType ?? "").trim();
  const locale: "en" | "es" = input.answersLocale === "es" ? "es" : "en";
  if (!/^[A-Z]{2}$/.test(code)) {
    throw new AppError("VALIDATION_ERROR", "stateCode must be 2 letters.", undefined, 422);
  }
  if (!filer) {
    throw new AppError("VALIDATION_ERROR", "filerType required.", undefined, 422);
  }

  const template = await getActiveCvcFormTemplate(supabase, code as "IL" | "IN");
  const row = {
    owner_user_id: ctx.userId,
    template_id: template?.id ?? null,
    state_code: code,
    filer_type: filer,
    answers: {},
    answers_locale: locale,
    case_id: input.caseId ?? null,
    completed_sections: [],
    current_section: null,
    status: "draft" as const,
  };
  const { data, error } = await supabase
    .from("intake_v2_sessions")
    .insert(row)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", error?.message ?? "Insert failed.", undefined, 500);
  }
  return data as IntakeV2Session;
}

/**
 * Find the most recent draft session owned by the current user for a given
 * legacy case. Returns null when none exists — the caller typically follows
 * up with createIntakeV2Session(caseId=…).
 */
export async function findDraftSessionForCase(
  ctx: AuthContext,
  caseId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<IntakeV2Session | null> {
  const { data, error } = await supabase
    .from("intake_v2_sessions")
    .select("*")
    .eq("case_id", caseId)
    .eq("owner_user_id", ctx.userId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", error.message, undefined, 500);
  return (data as IntakeV2Session | null) ?? null;
}

export async function getIntakeV2Session(
  ctx: AuthContext,
  sessionId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<IntakeV2Session> {
  const { data, error } = await supabase
    .from("intake_v2_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", error.message, undefined, 500);
  if (!data) throw new AppError("NOT_FOUND", "Session not found.", undefined, 404);
  const session = data as IntakeV2Session;
  ensureOwner(ctx, session);
  return session;
}

export interface PatchInput {
  answers?: Record<string, unknown>;
  completedSections?: string[];
  currentSection?: string | null;
}

/** Merges new answer keys into existing answers (does not replace the map). */
export async function patchIntakeV2Session(
  ctx: AuthContext,
  sessionId: string,
  input: PatchInput,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<IntakeV2Session> {
  const session = await getIntakeV2Session(ctx, sessionId, supabase);
  if (session.status !== "draft") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Submitted sessions cannot be edited.",
      undefined,
      422,
    );
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const nextAnswers: Record<string, unknown> =
    input.answers && typeof input.answers === "object"
      ? { ...session.answers, ...input.answers }
      : session.answers;
  if (input.answers && typeof input.answers === "object") {
    patch.answers = nextAnswers;
  }
  if (Array.isArray(input.completedSections)) {
    // Union of existing + new — never shrinks the completion set.
    const merged = new Set<string>([...session.completed_sections, ...input.completedSections]);
    patch.completed_sections = Array.from(merged);
  }
  if (input.currentSection !== undefined) {
    patch.current_section = input.currentSection;
  }
  // Stamp signed_at the first time all three cert fields are filled. Once
  // set, never recomputed — every PDF download surfaces this fixed date.
  if (session.signed_at === null && certificationComplete(nextAnswers)) {
    patch.signed_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from("intake_v2_sessions")
    .update(patch)
    .eq("id", sessionId)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", error?.message ?? "Update failed.", undefined, 500);
  }
  return data as IntakeV2Session;
}

/**
 * Phase D submit: transitions intake_v2_sessions to 'submitted' + audits.
 * Phase E will replace the body of this function with a real adapter that
 * builds a legacy intake payload from `answers` and calls
 * intakeService.submitIntake against a paired intake_sessions row.
 */
export async function submitIntakeV2Session(
  ctx: AuthContext,
  sessionId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<IntakeV2Session> {
  const session = await getIntakeV2Session(ctx, sessionId, supabase);
  if (session.status !== "draft") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Session has already been submitted.",
      undefined,
      422,
    );
  }

  // When the session was authored in Spanish, translate the string answers
  // into English exactly once here and cache under answers_en. The PDF
  // download route then reads answers_en directly for every render, avoiding
  // per-download model calls.
  let answersEn: Record<string, unknown> | null = session.answers_en;
  if (session.answers_locale === "es" && !answersEn) {
    const { translateAnswersToEnglish } = await import("./translationService");
    answersEn = await translateAnswersToEnglish(session.answers);
  }

  const { data, error } = await supabase
    .from("intake_v2_sessions")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      answers_en: answersEn,
    })
    .eq("id", sessionId)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", error?.message ?? "Submit failed.", undefined, 500);
  }
  const submitted = data as IntakeV2Session;

  await logEvent({
    ctx,
    action: "intake.completed",
    resourceType: "intake_v2_session",
    resourceId: submitted.id,
    organizationId: null,
    metadata: {
      state_code: submitted.state_code,
      filer_type: submitted.filer_type,
      template_id: submitted.template_id,
      answer_keys: Object.keys(submitted.answers).length,
      // Phase E will set this true once the legacy submitIntake adapter lands.
      legacy_intake_session_paired: false,
    },
  });
  return submitted;
}
