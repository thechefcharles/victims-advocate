/**
 * Parse "2026 CBOs VA.xlsx" (Illinois victim assistance / CBO directory) and geocode addresses.
 * Writes data/il-cbo-va-2026.json for the victim org map (merged in API).
 *
 * Usage:
 *   node scripts/build-il-cbo-va-directory.mjs "/path/to/2026 CBOs VA.xlsx"
 *   node scripts/build-il-cbo-va-directory.mjs --skip-geocode "/path/to/file.xlsx"  # parse only
 *
 * Geocoding: OpenStreetMap Nominatim (~1 req/s). Set NOMINATIM_USER_AGENT if needed.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "il-cbo-va-2026.json");

const UA =
  process.env.NOMINATIM_USER_AGENT?.trim() ||
  "NxtStps/1.0 (IL CBO directory import; contact: https://nxtstps.com)";

function normHeader(h) {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function pickCols(headers) {
  const idx = {};
  headers.forEach((h, i) => {
    const n = normHeader(h);
    if (n === "organization") idx.org = i;
    if (n === "full address" || n === "address") idx.address = i;
    if (n === "phone") idx.phone = i;
    if (n === "website") idx.website = i;
    if (n === "program type") idx.program = i;
  });
  return idx;
}

function cellStr(row, i) {
  if (i == null) return "";
  const v = row[i];
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && v.text != null) return String(v.text).trim();
  return String(v).trim();
}

function normalizeWebsite(w) {
  const t = w.trim();
  if (!t || /^not publicly/i.test(t) || t === "—" || t === "-") return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

async function geocodeAddress(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = Number.parseFloat(data[0].lat);
  const lng = Number.parseFloat(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    display_name: typeof data[0].display_name === "string" ? data[0].display_name : undefined,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--skip-geocode");
  const skipGeocode = process.argv.includes("--skip-geocode");
  const xlsxPath = args[0];
  if (!xlsxPath || !fs.existsSync(xlsxPath)) {
    console.error("Usage: node scripts/build-il-cbo-va-directory.mjs [--skip-geocode] <path-to.xlsx>");
    process.exit(1);
  }

  const wb = XLSX.readFile(xlsxPath, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (rows.length < 2) {
    console.error("Sheet empty");
    process.exit(1);
  }

  const headers = rows[0].map((h) => String(h));
  const col = pickCols(headers);
  if (col.org == null || col.address == null) {
    console.error("Could not find Organization / Full address columns. Headers:", headers);
    process.exit(1);
  }

  const raw = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const name = cellStr(row, col.org);
    const address = cellStr(row, col.address);
    const phone = cellStr(row, col.phone);
    let website = col.website != null ? cellStr(row, col.website) : "";
    website = normalizeWebsite(website);
    const programType = col.program != null ? cellStr(row, col.program) : "";

    if (!name || name === "Organization") continue;
    if (!address) continue;

    raw.push({
      name,
      program_type: programType,
      address,
      phone: phone || null,
      website: website || null,
    });
  }

  console.log(`Parsed ${raw.length} rows with name + address.`);

  const entries = [];
  let i = 0;
  for (const row of raw) {
    i += 1;
    const id = `ext:cbo-2026:${i}`;
    let lat = null;
    let lng = null;
    let geocode_query = `${row.address}, United States`;
    let geocode_ok = false;

    if (!skipGeocode) {
      try {
        const pt = await geocodeAddress(geocode_query);
        if (pt) {
          lat = pt.lat;
          lng = pt.lng;
          geocode_ok = true;
        }
      } catch (e) {
        console.warn(`Geocode failed row ${i} ${row.name}:`, e.message);
      }
      await sleep(1100);
    }

    entries.push({
      id,
      ...row,
      lat,
      lng,
      geocode_ok,
    });

    if (!skipGeocode && i % 25 === 0) console.log(`Geocoded ${i}/${raw.length}…`);
  }

  const payload = {
    source: "2026 CBOs VA.xlsx",
    generated_at: new Date().toISOString(),
    entries,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
  const ok = entries.filter((e) => e.geocode_ok).length;
  console.log(`Wrote ${OUT} (${ok}/${entries.length} with coordinates).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
