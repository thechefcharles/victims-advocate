/**
 * Insert Illinois directory orgs from data/il-nxtsteps-directory.json (parsed PDF).
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:
 *   node scripts/seed-il-directory.mjs           # insert
 *   node scripts/seed-il-directory.mjs --dry-run # count only
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const p = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(p)) return;
  const txt = fs.readFileSync(p, "utf8");
  for (const line of txt.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const dryRun = process.argv.includes("--dry-run");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const jsonPath = path.join(__dirname, "..", "data", "il-nxtsteps-directory.json");
const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const rows = json.rows.filter((r) => !r.parseError);

function inferType(name) {
  const n = name.toLowerCase();
  if (/state's attorney|states attorney|sheriff's office|police|prosecution/.test(n)) return "gov";
  if (/hospital|medical center|health system|cch\b/.test(n)) return "hospital";
  return "nonprofit";
}

function coverageForRow(row) {
  if (row.state === "IA") return { states: ["IA", "IL"] };
  return { states: ["IL"] };
}

if (dryRun) {
  console.log(`Dry run: ${rows.length} organizations would be inserted.`);
  process.exit(0);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const batchSize = 25;
let inserted = 0;
let failed = 0;

for (let i = 0; i < rows.length; i += batchSize) {
  const batch = rows.slice(i, i + batchSize).map((row) => ({
    name: row.name.slice(0, 500),
    type: inferType(row.name),
    status: "active",
    profile_status: "active",
    accepting_clients: true,
    capacity_status: "unknown",
    coverage_area: coverageForRow(row),
    metadata: {
      directory_key: `il-nxtsteps-${row.n}`,
      directory_source: "nxtsteps_il_pdf",
      listing_index: row.n,
      listing_address: row.address,
      listing_phone: row.phone || null,
      listing_website: row.website || null,
      listing_program_type: row.programType ?? null,
    },
  }));

  const { data, error } = await supabase.from("organizations").insert(batch).select("id");
  if (error) {
    console.error("Batch error:", error.message);
    for (const row of batch) {
      const { error: oneErr } = await supabase.from("organizations").insert(row).select("id");
      if (oneErr) {
        console.error("Row failed:", row.name.slice(0, 60), oneErr.message);
        failed++;
      } else {
        inserted++;
      }
    }
  } else {
    inserted += data?.length ?? batch.length;
  }
}

console.log(`Done. Inserted ~${inserted} rows. Failed: ${failed}.`);
console.log(
  "Note: Re-running creates duplicate rows unless you delete prior imports (filter metadata.directory_source = nxtsteps_il_pdf)."
);
