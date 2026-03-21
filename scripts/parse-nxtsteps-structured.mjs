/**
 * Parse paste-friendly directory text (one block per row):
 *   index
 *   Organization name
 *   Program type
 *   Full address (, IL|IA zip)
 *   Phone (###-###-####) OR "Not publicly listed"
 *   Optional: https://... OR "Not publicly listed"
 *
 * Skips repeated headers: PDF line / Organization / Program Type / Full address / Phone / Website
 *
 * Usage:
 *   node scripts/parse-nxtsteps-structured.mjs data/il-nxtsteps-directory-structured.txt > data/il-nxtsteps-directory.json
 *   node scripts/parse-nxtsteps-structured.mjs < paste.txt   # stdin
 */
import fs from "fs";

const inputPath = process.argv[2];
const raw = inputPath
  ? fs.readFileSync(inputPath, "utf8")
  : fs.readFileSync(0, "utf8");
const lines = raw
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l.length > 0);

/** Strip trailing "Affiliation Error" junk */
let end = lines.length;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].startsWith("Affiliation Error")) {
    end = i;
    break;
  }
}
const L = lines.slice(0, end);

function isHeaderLine(i) {
  return (
    L[i] === "PDF line" &&
    L[i + 1] === "Organization" &&
    L[i + 2] === "Program Type" &&
    L[i + 3] === "Full address" &&
    L[i + 4] === "Phone" &&
    L[i + 5] === "Website"
  );
}

function skipHeaders(i) {
  if (isHeaderLine(i)) return i + 6;
  return i;
}

const PHONE_RE = /^\d{3}-\d{3}-\d{4}$/;
const ADDR_RE = /,\s*(IL|IA)\s+\d{5}\s*$/;

function parsePhoneWebsite(start) {
  const a = L[start];
  const b = L[start + 1];

  if (PHONE_RE.test(a)) {
    if (b && /^https?:\/\//i.test(b)) return { phone: a, website: b, next: start + 2 };
    if (b === "Not publicly listed") return { phone: a, website: "Not publicly listed", next: start + 2 };
    return { phone: a, website: "", next: start + 1 };
  }

  if (a === "Not publicly listed") {
    if (b && /^https?:\/\//i.test(b)) return { phone: "Not publicly listed", website: b, next: start + 2 };
    if (b === "Not publicly listed") return { phone: "Not publicly listed", website: "Not publicly listed", next: start + 2 };
    return { phone: "Not publicly listed", website: "", next: start + 1 };
  }

  return null;
}

function nextBareIndexLine(from) {
  for (let j = from; j < L.length; j++) {
    const m = L[j].match(/^(\d{1,3})$/);
    if (m) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 224) return j;
    }
  }
  return L.length;
}

const byN = new Map();

let i = 0;
while (i < L.length) {
  i = skipHeaders(i);
  if (i >= L.length) break;

  const m = L[i].match(/^(\d{1,3})$/);
  if (!m) {
    i++;
    continue;
  }
  const n = Number(m[1]);
  if (n < 1 || n > 224) {
    i++;
    continue;
  }

  const name = L[i + 1];
  const programType = L[i + 2];
  const address = L[i + 3];
  if (!name || !programType || !address || !ADDR_RE.test(address)) {
    byN.set(n, {
      n,
      parseError: true,
      reason: "missing field or bad address",
      snippet: (address ?? "").slice(0, 100),
    });
    i = nextBareIndexLine(i + 1);
    continue;
  }

  const state = address.match(/\b(IL|IA)\s+\d{5}\s*$/)?.[1] ?? "IL";
  const pw = parsePhoneWebsite(i + 4);
  if (!pw) {
    byN.set(n, {
      n,
      parseError: true,
      reason: "phone/website",
      snippet: [L[i + 4], L[i + 5]].filter(Boolean).join(" | "),
    });
    i = nextBareIndexLine(i + 1);
    continue;
  }

  byN.set(n, {
    n,
    name,
    programType,
    address,
    state,
    phone: pw.phone,
    website: pw.website,
  });
  i = pw.next;
}

const all = [...byN.values()].sort((a, b) => a.n - b.n);
const ok = all.filter((r) => !r.parseError);
const bad = all.filter((r) => r.parseError);

console.log(
  JSON.stringify(
    {
      source: "structured_paste",
      count: ok.length,
      parseErrors: bad.length,
      rows: [...ok, ...bad],
    },
    null,
    2
  )
);
