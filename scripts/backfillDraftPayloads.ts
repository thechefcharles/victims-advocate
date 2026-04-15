/**
 * Domain 2.5 — One-time backfill: intake_sessions.draft_payload v1 → v2.
 *
 * Reads every intake_sessions row where intake_schema_version = 'v1' AND
 * draft_payload IS NOT NULL, rewrites the payload into flat canonical
 * field_key form (using form_alignment_mappings as the source of truth),
 * and flips intake_schema_version to 'v2'. Original payload is preserved
 * on `draft_payload_v1_backup`.
 *
 * Safe to re-run: the `status != 'submitted'` + `schema_version = 'v1'`
 * guard skips rows that have already been migrated. Submitted rows are
 * intentionally left alone — once locked, their snapshot lives on
 * intake_submissions.submitted_payload and is immutable.
 *
 * Run:
 *   npx tsx scripts/backfillDraftPayloads.ts
 *
 * Dry-run (no DB writes — prints planned counts + a few samples):
 *   BACKFILL_DRY_RUN=1 npx tsx scripts/backfillDraftPayloads.ts
 */

import {
  migrateV1DraftToV2,
  type FormAlignmentMapping,
} from "@/lib/server/intake/draftPayloadMigrator";

const BATCH_SIZE = 100;
const DRY_RUN = process.env.BACKFILL_DRY_RUN === "1";

interface SessionRow {
  id: string;
  draft_payload: Record<string, unknown> | null;
  intake_schema_version: string | null;
  draft_payload_v1_backup: unknown;
}

interface RunStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
}

async function run(): Promise<RunStats> {
  const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
  const supabase = getSupabaseAdmin();
  const stats: RunStats = { total: 0, migrated: 0, skipped: 0, errors: 0 };

  // ---- 1. Load intake mappings once --------------------------------------
  const { data: mappingRows, error: mapErr } = await supabase
    .from("form_alignment_mappings")
    .select("canonical_field_key, intake_field_path, mapping_purpose")
    .eq("mapping_purpose", "intake");
  if (mapErr) {
    console.error(`[backfill] failed to load mappings: ${mapErr.message}`);
    return stats;
  }
  const mappings = (mappingRows ?? []) as FormAlignmentMapping[];
  console.log(`[backfill] loaded ${mappings.length} intake mappings`);

  if (mappings.length === 0) {
    console.log(
      "[backfill] no intake mappings found — nothing to translate. Seed form_alignment_mappings first.",
    );
    return stats;
  }

  // ---- 2. Page through v1 sessions in batches of BATCH_SIZE --------------
  let lastId: string | null = null;
  for (;;) {
    let q = supabase
      .from("intake_sessions")
      .select("id, draft_payload, intake_schema_version, draft_payload_v1_backup")
      .eq("intake_schema_version", "v1")
      .not("draft_payload", "is", null)
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);
    if (lastId) q = q.gt("id", lastId);

    const { data: batch, error: batchErr } = await q;
    if (batchErr) {
      console.error(`[backfill] batch read failed: ${batchErr.message}`);
      stats.errors += 1;
      break;
    }
    const rows = (batch ?? []) as SessionRow[];
    if (rows.length === 0) break;

    for (const row of rows) {
      stats.total += 1;
      try {
        const v1 = (row.draft_payload ?? {}) as Record<string, unknown>;
        const v2 = migrateV1DraftToV2(v1, mappings);

        if (Object.keys(v2).length === 0) {
          stats.skipped += 1;
          continue;
        }

        if (DRY_RUN) {
          if (stats.total <= 3) {
            console.log(
              `[backfill][dry-run] ${row.id}: ${Object.keys(v1).length} v1 groups → ${Object.keys(v2).length} v2 keys`,
            );
          }
          stats.migrated += 1;
          continue;
        }

        // Capture the original payload into the backup column, then swap.
        const { error: updateErr } = await supabase
          .from("intake_sessions")
          .update({
            draft_payload_v1_backup: row.draft_payload_v1_backup ?? v1,
            draft_payload: v2,
            intake_schema_version: "v2",
          })
          .eq("id", row.id)
          .eq("intake_schema_version", "v1"); // optimistic guard
        if (updateErr) {
          console.error(`[backfill] ${row.id} failed: ${updateErr.message}`);
          stats.errors += 1;
          continue;
        }
        stats.migrated += 1;
      } catch (err) {
        console.error(
          `[backfill] ${row.id} threw: ${err instanceof Error ? err.message : String(err)}`,
        );
        stats.errors += 1;
      }
    }

    lastId = rows[rows.length - 1].id;
    if (rows.length < BATCH_SIZE) break;
  }

  return stats;
}

run()
  .then((stats) => {
    console.log(
      `[backfill] done — total=${stats.total} migrated=${stats.migrated} skipped=${stats.skipped} errors=${stats.errors}${DRY_RUN ? " (dry-run)" : ""}`,
    );
    process.exit(stats.errors > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error(`[backfill] fatal: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
