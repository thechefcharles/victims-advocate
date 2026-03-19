#!/usr/bin/env node
/**
 * Convert tab-separated programs.tsv → public/data/il-victim-assistance-programs.json
 * Columns: id, organization, programType, address, phone, website (website may be empty → null)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const tsvPath = path.join(root, "lib", "catalog", "programs.tsv");
const outPath = path.join(root, "public", "data", "il-victim-assistance-programs.json");

const raw = fs.readFileSync(tsvPath, "utf8");
const lines = raw.split(/\r?\n/).filter((l) => {
  const t = l.trim();
  return t && !t.startsWith("#");
});

const programs = [];
for (const line of lines) {
  const parts = line.split("\t");
  if (parts.length < 6) {
    console.error("Bad line (need 6 tab cols):", line.slice(0, 120));
    process.exit(1);
  }
  const id = parseInt(parts[0], 10);
  const websiteRaw = parts[5]?.trim();
  const website =
    !websiteRaw ||
    websiteRaw.toLowerCase() === "not publicly listed" ||
    websiteRaw === "—"
      ? null
      : websiteRaw;
  programs.push({
    id,
    organization: parts[1].trim(),
    programType: parts[2].trim(),
    address: parts[3].trim(),
    phone: parts[4].trim(),
    website,
  });
}

programs.sort((a, b) => a.id - b.id);
fs.writeFileSync(outPath, JSON.stringify(programs, null, 2), "utf8");
console.log("Wrote", programs.length, "programs to", outPath);
