/**
 * Parse extracted PDF text into JSON rows (NxtStps IL victim services directory).
 * Usage: node scripts/parse-nxtsteps-directory.mjs < extract.txt > data/il-nxtsteps-directory.json
 */
import fs from "fs";

const raw = fs.readFileSync(0, "utf8");
const cut = raw.split("Affiliation Error Message")[0] ?? raw;

const oneLine = cut.replace(/\r/g, "\n").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();

const ROW_SPLIT =
  /\s(?=(?:[1-9]|[1-9]\d|1\d\d|2[01]\d|22[0-4])\s+[A-Z][a-z])/g;
const chunks = oneLine.split(ROW_SPLIT).filter(Boolean);

function stripPdfNoise(s) {
  return s
    .replace(/\bPDF line Organization Program Type Full address Phon e Website\b/gi, "")
    .replace(/\bPD F line\b/gi, "")
    .replace(/\s+Organizatio n Program Type\b/gi, "")
    .trim();
}

function normalizeUrl(s) {
  if (!s || /not publicly listed/i.test(s)) return "Not publicly listed";
  return s.trim().replace(/\s+/g, "");
}

function splitNameStreet(nameStreet) {
  const sm = nameStreet.match(/^(.+?)\s+((?:PO Box|Suite|\d+)[\s\S]+)$/i);
  if (!sm) return null;
  return {
    name: sm[1].trim().replace(/\s+/g, " "),
    street: sm[2].trim().replace(/\s+/g, " "),
  };
}

function parseRow(rest) {
  const withUrl = rest.match(
    /^(.+),\s*([^,]+),\s*(IL|IA)\s+(\d{5})\s+([\d\-\s]+)\s+(https?:\/\/[\s\S]+|Not publi[\s\S]*?listed)\s*$/i
  );
  if (withUrl) {
    const phone = withUrl[5].replace(/\s+/g, "").replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    const tail = withUrl[6].trim();
    const website = /^https?:\/\//i.test(tail) ? normalizeUrl(tail) : "Not publicly listed";
    const ns = splitNameStreet(withUrl[1].trim());
    if (!ns) return null;
    return {
      name: ns.name,
      address: `${ns.street}, ${withUrl[2].trim()}, ${withUrl[3]} ${withUrl[4]}`,
      state: withUrl[3],
      phone,
      website,
    };
  }
  const noUrl = rest.match(
    /^(.+),\s*([^,]+),\s*(IL|IA)\s+(\d{5})\s+([\d\-\s]+)\s*$/i
  );
  if (!noUrl) return null;
  const phone = noUrl[5].replace(/\s+/g, "").replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  const ns = splitNameStreet(noUrl[1].trim());
  if (!ns) return null;
  return {
    name: ns.name,
    address: `${ns.street}, ${noUrl[2].trim()}, ${noUrl[3]} ${noUrl[4]}`,
    state: noUrl[3],
    phone,
    website: "",
  };
}

const rows = [];
const seenN = new Set();

for (const chunk of chunks) {
  const m = chunk.match(/^(\d{1,3})\s+([\s\S]+)$/);
  if (!m) continue;
  const num = Number(m[1]);
  if (num < 1 || num > 224) continue;

  const rest = stripPdfNoise(m[2].trim());
  if (!rest) continue;

  const parsed = parseRow(rest);
  if (!parsed) {
    rows.push({ n: num, parseError: true, snippet: rest.slice(0, 200) });
    continue;
  }

  if (seenN.has(num)) continue;
  seenN.add(num);

  rows.push({
    n: num,
    name: parsed.name,
    address: parsed.address,
    state: parsed.state,
    phone: parsed.phone,
    website: parsed.website,
  });
}

rows.sort((a, b) => a.n - b.n);

console.log(JSON.stringify({ count: rows.length, rows }, null, 2));
