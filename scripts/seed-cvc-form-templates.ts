/**
 * Domain 2.3 — CVC Form Processing: seeding script.
 *
 * Reads Base Truth modules and produces baseline cvc_form_templates,
 * cvc_form_fields, and form_alignment_mappings rows for IL and IN.
 * Safe to re-run: existing version_number=1 rows are detected; child rows
 * are wiped and re-inserted on each run.
 *
 * Run:
 *   npx tsx scripts/seed-cvc-form-templates.ts
 *
 * Dry-run (no DB writes — prints planned row counts only):
 *   SEED_DRY_RUN=1 npx tsx scripts/seed-cvc-form-templates.ts
 */

import { IL_CVC_FIELD_MAP } from "@/lib/pdfMaps/il_cvc_fieldMap";
import { IN_CVC_COORDS } from "@/lib/pdfMaps/in_cvc_coords";

// ---------------------------------------------------------------------------
// Plan derivation — pure, no DB calls
// ---------------------------------------------------------------------------

type PlannedField = {
  field_key: string;
  field_type: "text" | "checkbox";
  required: boolean;
  source_path: string | null;
  page_number?: number | null;
  x?: number | null;
  y?: number | null;
  font_size?: number | null;
};

type PlannedMapping = {
  field_key: string;
  canonical_field_key: string;
  intake_field_path: string;
  mapping_purpose: "intake";
  required: boolean;
};

type SeedPlan = {
  state_code: "IL" | "IN";
  template_id: string;
  form_name: string;
  seeded_from: string;
  source_pdf_path: string;
  fields: PlannedField[];
  mappings: PlannedMapping[];
};

const REQUIRED_IL_KEYS = new Set([
  "Victims Name",
  "Date of Birth",
  "Street Address",
  "City",
  "State",
  "Zip Code",
  "Cell Phone",
]);

function inferIlFieldType(key: string): "text" | "checkbox" {
  const lower = key.toLowerCase();
  if (lower.includes("check box") || lower.startsWith("check box")) return "checkbox";
  return "text";
}

function buildIlPlan(): SeedPlan {
  const fields: PlannedField[] = [];
  const mappings: PlannedMapping[] = [];

  for (const key of Object.keys(IL_CVC_FIELD_MAP)) {
    const field_type = inferIlFieldType(key);
    const required = REQUIRED_IL_KEYS.has(key);
    const sourcePath = `IL_CVC_FIELD_MAP["${key}"]`;
    fields.push({
      field_key: key,
      field_type,
      required,
      source_path: sourcePath,
    });
    if (required) {
      mappings.push({
        field_key: key,
        canonical_field_key: sourcePath,
        intake_field_path: sourcePath,
        mapping_purpose: "intake",
        required: true,
      });
    }
  }

  return {
    state_code: "IL",
    template_id: "il_cvc",
    form_name: "Illinois Crime Victims Compensation Application",
    seeded_from: "lib/pdfMaps/il_cvc_fieldMap.ts",
    source_pdf_path: "public/pdf/il_cvc_application.pdf",
    fields,
    mappings,
  };
}

function buildInPlan(): SeedPlan {
  const fields: PlannedField[] = [];
  const mappings: PlannedMapping[] = [];

  IN_CVC_COORDS.forEach((item, idx) => {
    const field_key = `in_field_${idx}`;
    const sourcePath = `IN_CVC_COORDS[${idx}]`;
    fields.push({
      field_key,
      field_type: "text",
      required: idx < 6, // first 6 entries are name + DOB + address — required
      source_path: sourcePath,
      page_number: item.pageIndex,
      x: item.x,
      y: item.y,
      font_size: item.fontSize ?? null,
    });
    if (idx < 6) {
      mappings.push({
        field_key,
        canonical_field_key: sourcePath,
        intake_field_path: sourcePath,
        mapping_purpose: "intake",
        required: true,
      });
    }
  });

  return {
    state_code: "IN",
    template_id: "in_cvc",
    form_name: "Indiana State Form 23776 (CVC)",
    seeded_from: "lib/pdfMaps/in_cvc_coords.ts",
    source_pdf_path: "public/pdf/indiana_cvc_application.pdf",
    fields,
    mappings,
  };
}

// ---------------------------------------------------------------------------
// DB execution
// ---------------------------------------------------------------------------

type RowCounts = {
  templates: number;
  fields: number;
  mappings: number;
};

function emptyCounts(): RowCounts {
  return { templates: 0, fields: 0, mappings: 0 };
}

async function applyPlan(plan: SeedPlan, counts: RowCounts, dryRun: boolean) {
  if (dryRun) {
    counts.templates += 1;
    counts.fields += plan.fields.length;
    counts.mappings += plan.mappings.length;
    console.log(
      `[seed-cvc] [dry-run] ${plan.state_code} ${plan.template_id} — ` +
        `${plan.fields.length} fields, ${plan.mappings.length} required mappings`,
    );
    return;
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
  const supabase = getSupabaseAdmin();

  // Find or create the v1 template row
  const { data: existing } = await supabase
    .from("cvc_form_templates")
    .select("id")
    .eq("state_code", plan.state_code)
    .eq("version_number", 1)
    .maybeSingle();

  let templateId: string;
  if (existing && (existing as { id?: string }).id) {
    templateId = (existing as { id: string }).id;
    console.log(`[seed-cvc] ${plan.state_code} v1 exists (${templateId}) — refreshing children`);
    await supabase.from("form_alignment_mappings").delete().eq("template_id", templateId);
    await supabase.from("cvc_form_fields").delete().eq("template_id", templateId);
  } else {
    const { data: inserted, error } = await supabase
      .from("cvc_form_templates")
      .insert({
        state_code: plan.state_code,
        form_name: plan.form_name,
        template_id: plan.template_id,
        version_number: 1,
        status: "draft",
        source_pdf_path: plan.source_pdf_path,
        seeded_from: plan.seeded_from,
        created_by: null,
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(`seed-cvc insert template: ${error?.message}`);
    templateId = (inserted as { id: string }).id;
    counts.templates += 1;
    console.log(`[seed-cvc] ${plan.state_code} v1 created (${templateId})`);
  }

  // Insert fields, capturing returned ids by field_key for mappings
  const fieldIdByKey = new Map<string, string>();
  for (const field of plan.fields) {
    const { data, error } = await supabase
      .from("cvc_form_fields")
      .insert({
        template_id: templateId,
        field_key: field.field_key,
        field_type: field.field_type,
        page_number: field.page_number ?? null,
        x: field.x ?? null,
        y: field.y ?? null,
        font_size: field.font_size ?? null,
        required: field.required,
        source_path: field.source_path,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`seed-cvc insert field: ${error?.message}`);
    fieldIdByKey.set(field.field_key, (data as { id: string }).id);
    counts.fields += 1;
  }

  // Insert mappings
  for (const mapping of plan.mappings) {
    const fieldId = fieldIdByKey.get(mapping.field_key);
    if (!fieldId) continue;
    const { error } = await supabase.from("form_alignment_mappings").insert({
      template_id: templateId,
      cvc_form_field_id: fieldId,
      canonical_field_key: mapping.canonical_field_key,
      intake_field_path: mapping.intake_field_path,
      mapping_purpose: mapping.mapping_purpose,
      required: mapping.required,
    });
    if (error) throw new Error(`seed-cvc insert mapping: ${error.message}`);
    counts.mappings += 1;
  }
}

async function main() {
  const dryRun = process.env.SEED_DRY_RUN === "1";
  const counts = emptyCounts();

  const ilPlan = buildIlPlan();
  const inPlan = buildInPlan();

  console.log(
    `[seed-cvc] cvc-form-templates — ${dryRun ? "DRY RUN" : "LIVE"} — ` +
      `IL fields: ${ilPlan.fields.length}, IL required mappings: ${ilPlan.mappings.length}, ` +
      `IN fields: ${inPlan.fields.length}, IN required mappings: ${inPlan.mappings.length}`,
  );

  await applyPlan(ilPlan, counts, dryRun);
  await applyPlan(inPlan, counts, dryRun);

  console.log("[seed-cvc] row counts:", counts);
  console.log("[seed-cvc] done.");
}

main().catch((err) => {
  console.error("[seed-cvc] FAILED:", err);
  process.exit(1);
});
