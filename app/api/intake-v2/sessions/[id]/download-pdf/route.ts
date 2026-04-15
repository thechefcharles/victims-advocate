/**
 * GET /api/intake-v2/sessions/[id]/download-pdf
 *
 * Returns the official IL CVC PDF with the applicant's answers filled in.
 * Owner-only. Uses cached English translations (answers_en) when the session
 * was authored in Spanish — never calls the translation model at download
 * time.
 *
 * Answer → PDF field resolution:
 *   - Direct map: cvc_form_fields rows whose source_path names a real
 *     AcroForm widget (source_path not matching 'synthetic:%').
 *   - Indirect map: consolidated synthetic fields (victim_gender,
 *     victim_marital_status, …) expand into one AcroForm widget per option
 *     via SYNTHETIC_TO_ACROFORM below. Yes/No/Unknown crime questions and
 *     the 29 Section-3 loss checkboxes reference unnamed `Check Box NN`
 *     widgets whose numbering isn't known without PDF-coordinate matching —
 *     those entries are left empty and flagged TODO. When they're filled in
 *     later, PDFs will automatically include those sections.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument, PDFCheckBox, PDFTextField } from "pdf-lib";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getIntakeV2Session } from "@/lib/server/intakeV2/intakeV2Service";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// -----------------------------------------------------------------------------
// Synthetic field → AcroForm widget expansion
// -----------------------------------------------------------------------------
// For consolidated dropdowns (where the renderer shows one <select> but the
// PDF has one checkbox per option), we list the AcroForm field_keys to
// check/uncheck per option value. The suffix `_2` markers target the
// applicant's duplicate widget set on the IL form.
// -----------------------------------------------------------------------------

type OptionToAcroformMap = Record<string, string[]>;

const VICTIM_GENDER_MAP: OptionToAcroformMap = {
  male: ["male"],
  female: ["female"],
  transgender_male: ["transgender_male"],
  transgender_female: ["transgender_female"],
  gnc: ["genderqueer_gender_non_conforming_gnc"],
  prefer_not_to_answer: ["prefer_not_to_answer"],
  not_listed: ["not_listed"],
};

const APPLICANT_GENDER_MAP: OptionToAcroformMap = {
  male: ["male_2"],
  female: ["female_2"],
  transgender_male: ["transgender_male_2"],
  transgender_female: ["transgender_female_2"],
  gnc: ["genderqueer_gender_non_conforming_gnc_2"],
  prefer_not_to_answer: ["prefer_not_to_answer_2"],
  not_listed: ["not_listed_2"],
};

const VICTIM_MARITAL_MAP: OptionToAcroformMap = {
  single: ["single"],
  married: ["married"],
  divorced: ["divorced"],
  widowed: ["widower"],
  civil_union: ["civil_union_partner"],
};

const APPLICANT_MARITAL_MAP: OptionToAcroformMap = {
  single: ["single_2"],
  married: ["married_2"],
  divorced: ["divorced_2"],
  widowed: ["widower_2"],
  civil_union: ["civil_union_partner_2"],
};

const VICTIM_RACE_MAP: OptionToAcroformMap = {
  white: ["white"],
  black: ["black_or_african_american"],
  asian: ["asian"],
  american_indian: ["american_indian_or_alaskan_native"],
  native_hawaiian: ["native_hawaiian"],
  other: ["other_race"],
};

const VICTIM_ETHNICITY_MAP: OptionToAcroformMap = {
  hispanic: ["hispanic_or_latino"],
  not_hispanic: ["not_hispanic_or_latino"],
};

// TODO: Y/N/Unknown crime questions (offender_arrested, offender_charged_in_court,
// required_to_testify, offender_charged_human_trafficking,
// required_to_testify_human_trafficking, restitution_ordered_yn) need
// `Check Box NN` → option-value mapping established via (page, x, y)
// correlation against the PDF. Until that pass runs, these dropdown answers
// will not appear in the downloaded PDF.
const EMPTY_MAP: OptionToAcroformMap = {};

// TODO: Section 3 losses (29 synthetic checkboxes — loss_medical_hospital,
// loss_dental, …) map one-to-one to un-named `Check Box NN` widgets on
// page 6. Same correlation pass needed.
const LOSSES_MAP: Record<string, string[]> = {};

const SYNTHETIC_TO_ACROFORM: Record<
  string,
  { kind: "option_map"; map: OptionToAcroformMap } | { kind: "checkbox"; acroforms: string[] }
> = {
  victim_gender: { kind: "option_map", map: VICTIM_GENDER_MAP },
  applicant_gender: { kind: "option_map", map: APPLICANT_GENDER_MAP },
  victim_marital_status: { kind: "option_map", map: VICTIM_MARITAL_MAP },
  applicant_marital_status: { kind: "option_map", map: APPLICANT_MARITAL_MAP },
  victim_race: { kind: "option_map", map: VICTIM_RACE_MAP },
  victim_ethnicity: { kind: "option_map", map: VICTIM_ETHNICITY_MAP },
  offender_arrested: { kind: "option_map", map: EMPTY_MAP },
  offender_charged_in_court: { kind: "option_map", map: EMPTY_MAP },
  required_to_testify: { kind: "option_map", map: EMPTY_MAP },
  offender_charged_human_trafficking: { kind: "option_map", map: EMPTY_MAP },
  required_to_testify_human_trafficking: { kind: "option_map", map: EMPTY_MAP },
  restitution_ordered_yn: { kind: "option_map", map: EMPTY_MAP },
};

for (const lossKey of Object.keys(LOSSES_MAP)) {
  SYNTHETIC_TO_ACROFORM[lossKey] = { kind: "checkbox", acroforms: LOSSES_MAP[lossKey] };
}

// -----------------------------------------------------------------------------

interface FieldRow {
  field_key: string;
  field_type: string;
  source_path: string | null;
}

function formatDateMmDdYyyy(value: string): string {
  // Accept 'YYYY-MM-DD' or ISO — fall back to the raw string.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  return `${m[2]}/${m[3]}/${m[1]}`;
}

function formatCurrency(value: unknown): string {
  if (typeof value === "number") return value.toFixed(2);
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n.toFixed(2);
    return value;
  }
  return "";
}

function writeToAcroformField(
  form: ReturnType<PDFDocument["getForm"]>,
  acroformKey: string,
  fieldType: string,
  value: unknown,
): void {
  let field;
  try {
    field = form.getField(acroformKey);
  } catch {
    return; // widget absent from this PDF — ignore silently.
  }
  if (field instanceof PDFCheckBox) {
    if (value === true) {
      try {
        field.check();
      } catch {
        /* ignore */
      }
    } else {
      try {
        field.uncheck();
      } catch {
        /* ignore */
      }
    }
    return;
  }
  if (field instanceof PDFTextField) {
    const str = stringifyForText(value, fieldType);
    if (str !== null) {
      try {
        field.setText(str);
      } catch {
        /* ignore */
      }
    }
  }
}

function stringifyForText(value: unknown, fieldType: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "Yes" : "";
  if (typeof value === "number") {
    return fieldType === "currency" ? value.toFixed(2) : String(value);
  }
  if (typeof value === "string") {
    if (value.trim().length === 0) return null;
    if (fieldType === "date") return formatDateMmDdYyyy(value);
    if (fieldType === "currency") return formatCurrency(value);
    return value;
  }
  return null;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;
    if (!id) return apiFail("VALIDATION_ERROR", "Missing session id.");

    const session = await getIntakeV2Session(ctx, id);
    const templateId = session.template_id;
    if (!templateId) {
      return apiFail("NOT_FOUND", "Session has no linked template.", undefined, 404);
    }

    // Read PDF-backed fields. Synthetic rows are routed through the
    // hardcoded map above; real AcroForm rows (source_path not starting
    // with 'synthetic:') are written directly by name.
    const supabase = getSupabaseAdmin();
    const { data: fieldRows, error: fieldsErr } = await supabase
      .from("cvc_form_fields")
      .select("field_key, field_type, source_path")
      .eq("template_id", templateId);
    if (fieldsErr) {
      return apiFail("INTERNAL", fieldsErr.message);
    }

    // Prefer the English-translation cache when available (sessions authored
    // in Spanish). Falls through to raw answers for 'en' sessions.
    const renderAnswers =
      session.answers_en && Object.keys(session.answers_en).length > 0
        ? session.answers_en
        : session.answers;

    const pdfPath = path.join(
      process.cwd(),
      "public",
      "pdf",
      "il_cvc_application.pdf",
    );
    const pdfBytes = readFileSync(pdfPath);
    const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const form = doc.getForm();

    // Pass 1 — direct: real AcroForm widget-backed rows.
    for (const row of (fieldRows ?? []) as FieldRow[]) {
      if (!row.source_path || row.source_path.startsWith("synthetic:")) continue;
      const value = renderAnswers[row.field_key];
      if (value === undefined) continue;
      writeToAcroformField(form, row.source_path, row.field_type, value);
    }

    // Pass 2 — synthetic consolidated fields expand via the option map.
    for (const [syntheticKey, spec] of Object.entries(SYNTHETIC_TO_ACROFORM)) {
      const value = renderAnswers[syntheticKey];
      if (value === undefined || value === null) continue;
      if (spec.kind === "option_map") {
        if (typeof value !== "string") continue;
        const targets = spec.map[value] ?? [];
        for (const acroformKey of targets) {
          writeToAcroformField(form, acroformKey, "checkbox", true);
        }
      } else {
        // direct checkbox → one or more AcroForm widgets
        if (value !== true) continue;
        for (const acroformKey of spec.acroforms) {
          writeToAcroformField(form, acroformKey, "checkbox", true);
        }
      }
    }

    // Signature / date stamp — derived from session.signed_at.
    if (session.signed_at) {
      const sig = renderAnswers.cert_typed_signature;
      if (typeof sig === "string" && sig.trim().length > 0) {
        writeToAcroformField(form, "Applicant Signature", "text", sig);
      }
      const d = new Date(session.signed_at);
      if (!Number.isNaN(d.getTime())) {
        const stamp = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
        writeToAcroformField(form, "Date Signed", "text", stamp);
      }
    }

    // Flatten so values render in every viewer and can't be edited in-place.
    try {
      form.flatten();
    } catch (err) {
      logger.warn("intake_v2.pdf.flatten_failed", {
        session_id: id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const outBytes = await doc.save();
    return new Response(outBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition":
          'attachment; filename="il-cvc-application.pdf"',
        "cache-control": "private, no-store",
      },
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("intake_v2.sessions.download_pdf.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
