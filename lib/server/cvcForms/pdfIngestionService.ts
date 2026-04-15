/**
 * Domain 2.3 — CVC PDF ingestion.
 *
 * Reads an official state CVC PDF and turns the AcroForm's field metadata
 * into `cvc_form_fields` rows so the dynamic renderer (and the existing
 * generation pipeline) can drive intake from data instead of hand-typed
 * config.
 *
 * Upsert rule: keyed on (template_id, field_key).
 *   - field_key not present → INSERT
 *   - field_key present and `is_visible_to_applicant=false` → SKIP
 *     (admin curated the row; never overwrite)
 *   - otherwise → UPDATE the renderer-relevant fields, preserve manual
 *     additions like help_text / placeholder / conditional_on.
 */

import {
  PDFDocument,
  PDFCheckBox,
  PDFTextField,
  PDFDropdown,
  PDFOptionList,
  PDFSignature,
  type PDFField,
  type PDFForm,
} from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import type { CvcFormFieldType } from "./cvcFormTypes";

export interface IngestedField {
  fieldKey: string;
  label: string;
  fieldType: CvcFormFieldType;
  pageNumber: number;
  x: number;
  y: number;
  required: boolean;
  sourcePath: string;
  sectionKey: string | null;
  displayOrder: number;
}

export interface IngestResult {
  fieldsCreated: number;
  fieldsUpdated: number;
  skipped: number;
  fields: IngestedField[];
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Convert a raw AcroForm field name into a stable snake_case key.
 *
 *   "Claimant.FirstName"          → "claimant_first_name"
 *   "Medical Expenses - Total"    → "medical_expenses_total"
 *   "victim__DOB"                 → "victim_dob"
 *
 * Strategy: insert an underscore between camelCase boundaries, lowercase,
 * replace any run of non-alphanumeric chars with a single `_`, trim
 * leading/trailing underscores, cap at 100 chars.
 */
export function normalizePdfFieldName(rawName: string): string {
  if (!rawName) return "";
  const camelSplit = rawName
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2");
  const lowered = camelSplit.toLowerCase();
  const cleaned = lowered.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned.slice(0, 100);
}

// Ordered most-specific → least-specific. The generic "losses" bucket sits
// after medical / employment / funeral so a "medical_expenses" name routes
// to "medical", not "losses". Tabular rows (`_rowN`) are forced into losses
// early because most row-based fields on IL/IN forms are bill/collateral
// tables whose column headers (city, phone, dates) would otherwise steal
// them into applicant.
// Haystack is pre-normalized (see guessSectionKey): lowercased, pdf-lib's
// duplicate-field `_N` suffix stripped, underscores → spaces. That means
// \b boundaries behave naturally and multi-word phrases use spaces.
const SECTION_KEYWORDS: Array<[RegExp, string]> = [
  [/\brow\d+\b|\brow\b/, "losses"],
  [/(medical|hospital|doctor|treatment|diagnos|therapy|counsel|mental health|prescription|pharmac|clinic)/, "medical"],
  [/(employ|wage|income|\bwork\b|salary|paystub|earning|\bjob\b|occupation)/, "employment"],
  [/(funeral|burial|death|deceased|cemetery|mortuary)/, "funeral"],
  [/(offender|traffick|arrest|prosecut|police|criminal case|court case|outcome of|incident|offense|\bcrime\b|report date|what happened|when did|where did|cooperation)/, "crime"],
  [/(\bvictims?\b|injur)/, "victim"],
  [/(applicant|claimant|filer|relationship|date of birth|\bdob\b|\bssn\b|social security|address|street|\bapt\b|\bcity\b|\bstate\b|\bzip\b|\bcounty\b|\bphone\b|telephone|\bcell\b|email|gender|\bmale\b|female|transgender|genderqueer|marital|married|single|divorced|widow|civil union|\brace\b|ethnic|hispanic|latino|\bwhite\b|asian|black|african|native hawaiian|islander|alaskan|american indian|prefer not|not listed|language|disabil|developmental|\bphysical\b|\bmental\b|ardc|attorney|lawyer|organization|represent|nature of disability|alternate phone)/, "applicant"],
  [/(document|attach|upload|receipt|invoice|\bproof\b)/, "documents"],
  [/(signature|certif|\bauth|acknowledg|consent|declar|affirm|notar)/, "summary"],
  [/(\bloss\b|expense|\bbill\b|\bpaid\b|\bamount\b|\bclaim\b|\bcost\b|\bfee\b|insurance|medicare|medicaid|\bssi\b|ssdi|veteran|union insurance|dental|vision|collateral|provider|services?|auto insurance|discount|litigation)/, "losses"],
];

/** Best-guess UX section. Returns null when no keyword matches. */
export function guessSectionKey(fieldName: string): string | null {
  if (!fieldName) return null;
  const haystack = fieldName
    .toLowerCase()
    .replace(/_\d+$/, "")
    .replace(/_/g, " ");
  for (const [re, section] of SECTION_KEYWORDS) {
    if (re.test(haystack)) return section;
  }
  return null;
}

/** Convert a raw field key into a human label ("first_name" → "First Name"). */
export function labelFromFieldKey(fieldKey: string): string {
  if (!fieldKey) return "";
  return fieldKey
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Decide the field_type from the pdf-lib widget class plus the field name.
 * Date/currency live inside PDFTextField in pdf-lib so they need name hints.
 */
export function detectFieldType(field: PDFField, rawName: string): CvcFormFieldType {
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFSignature) return "signature";
  if (field instanceof PDFDropdown || field instanceof PDFOptionList) return "text";
  if (field instanceof PDFTextField) {
    // Multiline takes precedence — a long-form description field whose name
    // happens to include "incident" is still a textarea, not a date.
    try {
      if (field.isMultiline()) return "textarea";
    } catch {
      /* not all PDFTextField instances expose isMultiline cleanly */
    }
    const lower = rawName.toLowerCase();
    if (/(amount|cost|expense|award|wage|income|fee)/.test(lower)) return "currency";
    if (/(date|dob|birth)/.test(lower)) return "date";
    return "text";
  }
  return "text";
}

interface WidgetPosition {
  pageNumber: number;
  x: number;
  y: number;
}

function readWidgetPosition(form: PDFForm, field: PDFField): WidgetPosition {
  try {
    const widgets = field.acroField.getWidgets();
    if (widgets.length === 0) return { pageNumber: 1, x: 0, y: 0 };
    const widget = widgets[0];
    const rect = widget.getRectangle();
    const pageRef = widget.P();
    let pageNumber = 1;
    if (pageRef) {
      const doc = form.doc;
      const pages = doc.getPages();
      for (let i = 0; i < pages.length; i += 1) {
        if (pages[i].ref === pageRef) {
          pageNumber = i + 1;
          break;
        }
      }
    }
    return { pageNumber, x: rect.x, y: rect.y };
  } catch {
    return { pageNumber: 1, x: 0, y: 0 };
  }
}

function isRequired(field: PDFField): boolean {
  try {
    return field.isRequired();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Extraction (exported for testability — accepts a PDFDocument)
// ---------------------------------------------------------------------------

export function extractFieldsFromForm(form: PDFForm): IngestedField[] {
  const fields = form.getFields();
  const draft: IngestedField[] = fields.map((field) => {
    const rawName = field.getName();
    const fieldKey = normalizePdfFieldName(rawName);
    const pos = readWidgetPosition(form, field);
    return {
      fieldKey,
      label: labelFromFieldKey(fieldKey),
      fieldType: detectFieldType(field, rawName),
      pageNumber: pos.pageNumber,
      x: pos.x,
      y: pos.y,
      required: isRequired(field),
      sourcePath: rawName,
      sectionKey: guessSectionKey(rawName),
      displayOrder: 0, // assigned after sort
    };
  });

  // PDF coordinate origin is bottom-left, so higher y = higher on page.
  // Sort: page asc, then y desc, then x asc — produces top-down, left-right.
  draft.sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
    if (a.y !== b.y) return b.y - a.y;
    return a.x - b.x;
  });
  draft.forEach((f, i) => {
    f.displayOrder = (f.pageNumber - 1) * 1000 + i;
  });
  // Strip any empty-key entries (defensive — PDFs occasionally have nameless widgets).
  return draft.filter((f) => f.fieldKey.length > 0);
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

interface ExistingRow {
  id: string;
  field_key: string;
  is_visible_to_applicant: boolean;
}

export async function ingestCvcPdf(
  pdfBuffer: Buffer | Uint8Array,
  templateId: string,
  supabase: SupabaseClient,
): Promise<IngestResult> {
  if (!templateId) {
    throw new AppError("VALIDATION_ERROR", "templateId required.", undefined, 422);
  }
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Empty PDF buffer.", undefined, 422);
  }

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  } catch (err) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Could not parse PDF: ${(err as Error).message}`,
      undefined,
      422,
    );
  }
  let form: PDFForm;
  try {
    form = doc.getForm();
  } catch (err) {
    throw new AppError(
      "VALIDATION_ERROR",
      `PDF has no AcroForm: ${(err as Error).message}`,
      undefined,
      422,
    );
  }

  const fields = extractFieldsFromForm(form);
  if (fields.length === 0) {
    return { fieldsCreated: 0, fieldsUpdated: 0, skipped: 0, fields: [] };
  }

  const { data: existingRows, error: readErr } = await supabase
    .from("cvc_form_fields")
    .select("id, field_key, is_visible_to_applicant")
    .eq("template_id", templateId);
  if (readErr) throw new AppError("INTERNAL", readErr.message, undefined, 500);

  const existingByKey = new Map<string, ExistingRow>();
  for (const r of (existingRows ?? []) as ExistingRow[]) {
    existingByKey.set(r.field_key, r);
  }

  let fieldsCreated = 0;
  let fieldsUpdated = 0;
  let skipped = 0;

  for (const f of fields) {
    const existing = existingByKey.get(f.fieldKey);
    if (existing && existing.is_visible_to_applicant === false) {
      // Admin-curated internal field — never overwrite.
      skipped += 1;
      continue;
    }
    if (!existing) {
      const { error } = await supabase.from("cvc_form_fields").insert({
        template_id: templateId,
        field_key: f.fieldKey,
        label: f.label,
        field_type: f.fieldType,
        page_number: f.pageNumber,
        x: f.x,
        y: f.y,
        required: f.required,
        source_path: f.sourcePath,
        section_key: f.sectionKey,
        display_order: f.displayOrder,
      });
      if (error) throw new AppError("INTERNAL", error.message, undefined, 500);
      fieldsCreated += 1;
      continue;
    }
    // UPDATE only the renderer-derivable columns — preserve admin additions
    // (help_text, placeholder, input_options, conditional_on, validation_rules).
    const { error } = await supabase
      .from("cvc_form_fields")
      .update({
        label: f.label,
        field_type: f.fieldType,
        page_number: f.pageNumber,
        x: f.x,
        y: f.y,
        required: f.required,
        source_path: f.sourcePath,
        section_key: f.sectionKey,
        display_order: f.displayOrder,
      })
      .eq("id", existing.id);
    if (error) throw new AppError("INTERNAL", error.message, undefined, 500);
    fieldsUpdated += 1;
  }

  return { fieldsCreated, fieldsUpdated, skipped, fields };
}
