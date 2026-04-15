/**
 * One-shot bootstrap for the IL intake-v2 renderer.
 *
 * 1. Resolves (or creates) the active `cvc_form_templates` row for IL and
 *    links it to the active IL `state_workflow_configs` row.
 * 2. Runs the PDF ingestion pipeline against public/pdf/il_cvc_application.pdf
 *    to populate `cvc_form_fields`.
 * 3. Backfills `section_key` for any rows the ingestion couldn't guess
 *    (runs the same keyword matcher over source_path as a second pass).
 * 4. Recomputes `display_order` — per-section sequential integers with
 *    page_number ASC, y DESC as the sort key (PDF origin is bottom-left).
 * 5. Flips `is_visible_to_applicant` to false for un-sectioned fields
 *    (coordinate-only / admin-only bits) and true otherwise.
 *
 * Idempotent: re-running won't create duplicate templates or fields. A
 * pre-existing active IL template is reused; the ingestion service's upsert
 * logic handles the field rows.
 *
 * Run:
 *   npx tsx scripts/bootstrap-il-intake-v2.ts
 */

import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  ingestCvcPdf,
  guessSectionKey,
} from "@/lib/server/cvcForms/pdfIngestionService";

// tsx doesn't auto-load .env.local the way Next does. Load it once before
// any Supabase client tries to read process.env. Mirrors the loader in
// scripts/seed-il-directory.mjs.
(function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const txt = readFileSync(p, "utf8");
  for (const line of txt.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
})();

const STATE_CODE = "IL";
const TEMPLATE_ID = "il_cvc";
const FORM_NAME = "Illinois Crime Victims Compensation";
const DISPLAY_NAME = "Illinois Crime Victims Compensation";
const PDF_PATH = "public/pdf/il_cvc_application.pdf";

interface FieldRow {
  id: string;
  field_key: string;
  source_path: string | null;
  section_key: string | null;
  page_number: number | null;
  y: number | null;
}

async function main(): Promise<void> {
  const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
  const supabase = getSupabaseAdmin();

  // -------------------------------------------------------------------------
  // 1. Resolve or create the active IL template.
  // -------------------------------------------------------------------------
  const { data: swc, error: swcErr } = await supabase
    .from("state_workflow_configs")
    .select("id")
    .eq("state_code", STATE_CODE)
    .eq("status", "active")
    .maybeSingle();
  if (swcErr) {
    throw new Error(`state_workflow_configs lookup failed: ${swcErr.message}`);
  }
  const stateWorkflowConfigId = (swc as { id: string } | null)?.id ?? null;
  if (!stateWorkflowConfigId) {
    console.warn(
      `[bootstrap] no active state_workflow_configs row for ${STATE_CODE} — template will be created without the FK link`,
    );
  }

  let templateId: string;
  {
    const { data: existing, error: readErr } = await supabase
      .from("cvc_form_templates")
      .select("id, status")
      .eq("state_code", STATE_CODE)
      .eq("status", "active")
      .maybeSingle();
    if (readErr) throw new Error(`cvc_form_templates read: ${readErr.message}`);
    if (existing && (existing as { id?: string }).id) {
      templateId = (existing as { id: string }).id;
      console.log(`[bootstrap] active IL template exists: ${templateId}`);
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("cvc_form_templates")
        .insert({
          state_workflow_config_id: stateWorkflowConfigId,
          state_code: STATE_CODE,
          form_name: FORM_NAME,
          template_id: TEMPLATE_ID,
          version_number: 1,
          status: "active",
          source_pdf_path: PDF_PATH,
          seeded_from: "bootstrap-il-intake-v2",
          published_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        throw new Error(`cvc_form_templates insert: ${insErr?.message ?? "no row"}`);
      }
      templateId = (inserted as { id: string }).id;
      console.log(
        `[bootstrap] created active IL template: ${templateId} (${DISPLAY_NAME})`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // 2. Run the PDF ingestion pipeline.
  // -------------------------------------------------------------------------
  const pdfBuffer = await readFile(path.join(process.cwd(), PDF_PATH));
  const ingestion = await ingestCvcPdf(pdfBuffer, templateId, supabase);
  console.log(
    `[bootstrap] PDF ingestion — created=${ingestion.fieldsCreated} updated=${ingestion.fieldsUpdated} skipped=${ingestion.skipped} total_extracted=${ingestion.fields.length}`,
  );

  // -------------------------------------------------------------------------
  // 3. Backfill section_key for any rows the ingestion couldn't guess (may
  //    happen if the ingestion normalizer stripped a keyword the raw
  //    source_path still carries).
  // -------------------------------------------------------------------------
  const { data: rowsForBackfill, error: rowsErr } = await supabase
    .from("cvc_form_fields")
    .select("id, field_key, source_path, section_key, page_number, y")
    .eq("template_id", templateId);
  if (rowsErr) throw new Error(`cvc_form_fields read: ${rowsErr.message}`);
  const allRows = (rowsForBackfill ?? []) as FieldRow[];

  let sectionKeyFilled = 0;
  let sectionKeyCleared = 0;
  for (const row of allRows) {
    const candidate =
      guessSectionKey(row.source_path ?? "") ?? guessSectionKey(row.field_key ?? "");
    if (candidate === row.section_key) continue;
    const { error } = await supabase
      .from("cvc_form_fields")
      .update({ section_key: candidate })
      .eq("id", row.id);
    if (error) {
      console.warn(`[bootstrap] section_key update failed for ${row.id}: ${error.message}`);
      continue;
    }
    row.section_key = candidate;
    if (candidate) sectionKeyFilled += 1;
    else sectionKeyCleared += 1;
  }
  console.log(
    `[bootstrap] section_key re-evaluated — set=${sectionKeyFilled} cleared=${sectionKeyCleared}`,
  );

  // -------------------------------------------------------------------------
  // 4. Per-section display_order — page ASC, y DESC (PDF origin bottom-left),
  //    field_key as deterministic tiebreaker. Assigns 0..N-1 within each
  //    section so the renderer's sort is stable and 1-indexed friendly.
  // -------------------------------------------------------------------------
  const bySection = new Map<string, FieldRow[]>();
  for (const row of allRows) {
    const key = row.section_key ?? "__unsectioned__";
    const list = bySection.get(key) ?? [];
    list.push(row);
    bySection.set(key, list);
  }
  let displayOrderWrites = 0;
  for (const [, list] of bySection) {
    list.sort((a, b) => {
      const ap = a.page_number ?? 0;
      const bp = b.page_number ?? 0;
      if (ap !== bp) return ap - bp;
      const ay = a.y ?? 0;
      const by = b.y ?? 0;
      if (ay !== by) return by - ay;
      return (a.field_key ?? "").localeCompare(b.field_key ?? "");
    });
    for (let i = 0; i < list.length; i += 1) {
      const row = list[i];
      const { error } = await supabase
        .from("cvc_form_fields")
        .update({ display_order: i })
        .eq("id", row.id);
      if (error) {
        console.warn(`[bootstrap] display_order update failed for ${row.id}: ${error.message}`);
        continue;
      }
      displayOrderWrites += 1;
    }
  }
  console.log(`[bootstrap] rewrote display_order on ${displayOrderWrites} row(s)`);

  // -------------------------------------------------------------------------
  // 5. Flip is_visible_to_applicant based on whether a section_key was
  //    resolved. Un-sectioned fields are PDF coordinate / admin-only rows
  //    that the renderer should never show.
  // -------------------------------------------------------------------------
  const { error: visTrueErr } = await supabase
    .from("cvc_form_fields")
    .update({ is_visible_to_applicant: true })
    .eq("template_id", templateId)
    .not("section_key", "is", null);
  if (visTrueErr) {
    console.warn(`[bootstrap] visible=true update failed: ${visTrueErr.message}`);
  }
  const { error: visFalseErr } = await supabase
    .from("cvc_form_fields")
    .update({ is_visible_to_applicant: false })
    .eq("template_id", templateId)
    .is("section_key", null);
  if (visFalseErr) {
    console.warn(`[bootstrap] visible=false update failed: ${visFalseErr.message}`);
  }

  // -------------------------------------------------------------------------
  // 6. Summary.
  // -------------------------------------------------------------------------
  const { data: finalRows } = await supabase
    .from("cvc_form_fields")
    .select("section_key, is_visible_to_applicant")
    .eq("template_id", templateId);
  const final = (finalRows ?? []) as Array<{
    section_key: string | null;
    is_visible_to_applicant: boolean;
  }>;

  const bucketCounts = new Map<string, number>();
  let visibleCount = 0;
  for (const row of final) {
    const key = row.section_key ?? "(unsectioned)";
    bucketCounts.set(key, (bucketCounts.get(key) ?? 0) + 1);
    if (row.is_visible_to_applicant) visibleCount += 1;
  }

  console.log("\n[bootstrap] ===== Summary =====");
  console.log(`  Template ID              ${templateId}`);
  console.log(`  Total fields             ${final.length}`);
  console.log(`  Fields visible (to UI)   ${visibleCount}`);
  console.log(`  Fields per section:`);
  const sortedSections = Array.from(bucketCounts.entries()).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sortedSections) {
    console.log(`    ${key.padEnd(18)} ${count}`);
  }
}

main()
  .then(() => {
    console.log("[bootstrap] done");
    process.exit(0);
  })
  .catch((err) => {
    console.error(
      `[bootstrap] fatal: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  });
