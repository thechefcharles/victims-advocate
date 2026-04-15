/**
 * Domain 2.5 — Template fields for the dynamic intake renderer.
 *
 * Resolves the active cvc_form_template for a state, loads applicant-visible
 * cvc_form_fields, groups by section_key, orders by display_order, and
 * filters by filer_type (when conditional_on encodes a filer rule).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { getActiveCvcFormTemplate } from "@/lib/server/cvcForms/cvcFormRepository";
import type {
  CvcFormFieldRecord,
  CvcFormFieldType,
} from "@/lib/server/cvcForms/cvcFormTypes";
import { evaluateConditional, type ConditionalRule } from "./conditional";

const SECTION_TITLES: Record<string, string> = {
  victim_info: "Section 1A — Victim Information",
  applicant_info: "Section 1B — Applicant Information",
  contact_info: "Section 1C — Contact Information",
  crime_info: "Section 2A — Crime Information",
  protection_civil: "Section 2B-E — Court & Protection",
  losses_claimed: "Section 3 — Losses Claimed",
  medical: "Section 4 — Medical Information",
  employment: "Section 5 — Employment Information",
  funeral: "Section 6 — Funeral & Burial",
  certification: "Section 7 — Certification",
};

// Canonical render order. Unknown section_keys sort to the end
// alphabetically via compareSection below.
const SECTION_ORDER: string[] = [
  "victim_info",
  "applicant_info",
  "contact_info",
  "crime_info",
  "protection_civil",
  "losses_claimed",
  "medical",
  "employment",
  "funeral",
  "certification",
];

/** Fallback title for section_keys not in SECTION_TITLES: title-case
 *  the key with underscores as spaces. */
function fallbackTitle(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export interface RenderField {
  fieldKey: string;
  label: string;
  fieldType: CvcFormFieldType;
  required: boolean;
  helpText: string | null;
  placeholder: string | null;
  inputOptions: Array<{ value: string; label: string }> | null;
  conditionalOn: ConditionalRule | null;
  validationRules: Record<string, unknown> | null;
}

export interface RenderSection {
  sectionKey: string;
  sectionTitle: string;
  fields: RenderField[];
}

export interface TemplateFieldsResponse {
  templateId: string;
  stateCode: string;
  sections: RenderSection[];
}

function toRenderField(row: CvcFormFieldRecord): RenderField {
  return {
    fieldKey: row.field_key,
    label: row.label ?? row.field_key,
    fieldType: row.field_type,
    required: row.required,
    helpText: row.help_text,
    placeholder: row.placeholder,
    inputOptions: row.input_options,
    conditionalOn: (row.conditional_on as ConditionalRule | null) ?? null,
    validationRules: (row.validation_rules as Record<string, unknown> | null) ?? null,
  };
}

function sortByDisplayOrder(a: CvcFormFieldRecord, b: CvcFormFieldRecord): number {
  const aOrd = a.display_order ?? Number.MAX_SAFE_INTEGER;
  const bOrd = b.display_order ?? Number.MAX_SAFE_INTEGER;
  if (aOrd !== bOrd) return aOrd - bOrd;
  return (a.field_key ?? "").localeCompare(b.field_key ?? "");
}

function compareSection(a: string, b: string): number {
  const aIdx = SECTION_ORDER.indexOf(a);
  const bIdx = SECTION_ORDER.indexOf(b);
  if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
  if (aIdx === -1) return 1;
  if (bIdx === -1) return -1;
  return aIdx - bIdx;
}

/**
 * Filter rule that drops fields whose conditional_on encodes a filer-type
 * gate that doesn't match the requested filer. Other conditional rules pass
 * through to the client (they depend on dynamic answer state).
 */
function passesFilerFilter(
  field: CvcFormFieldRecord,
  filerType: string | null,
): boolean {
  const rule = field.conditional_on as ConditionalRule | null;
  if (!rule) return true;
  if (rule.field_key !== "filer_type") return true; // not a filer gate — keep
  if (!filerType) return true;
  return evaluateConditional(rule, { filer_type: filerType });
}

export async function getTemplateFields(
  stateCode: string,
  filerType: string | null,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<TemplateFieldsResponse> {
  const code = (stateCode ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    throw new AppError("VALIDATION_ERROR", "stateCode must be 2 letters.", undefined, 422);
  }

  const template = await getActiveCvcFormTemplate(
    supabase,
    code as "IL" | "IN",
  );
  if (!template) {
    throw new AppError(
      "NOT_FOUND",
      `No active CVC template for ${code}.`,
      undefined,
      404,
    );
  }

  const { data: fields, error } = await supabase
    .from("cvc_form_fields")
    .select("*")
    .eq("template_id", template.id)
    .eq("is_visible_to_applicant", true);
  if (error) throw new AppError("INTERNAL", error.message, undefined, 500);

  const visible = ((fields ?? []) as CvcFormFieldRecord[]).filter((f) =>
    passesFilerFilter(f, filerType),
  );

  const bySection = new Map<string, CvcFormFieldRecord[]>();
  for (const f of visible) {
    const key = f.section_key ?? "summary";
    const list = bySection.get(key) ?? [];
    list.push(f);
    bySection.set(key, list);
  }

  const sections: RenderSection[] = Array.from(bySection.entries())
    .sort((a, b) => compareSection(a[0], b[0]))
    .map(([sectionKey, rows]) => ({
      sectionKey,
      sectionTitle: SECTION_TITLES[sectionKey] ?? fallbackTitle(sectionKey),
      fields: rows.sort(sortByDisplayOrder).map(toRenderField),
    }));

  return {
    templateId: template.id,
    stateCode: code,
    sections,
  };
}
