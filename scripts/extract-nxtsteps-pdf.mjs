/**
 * One-off: extract text from NxtStps org PDF for building seed data.
 * Usage: node scripts/extract-nxtsteps-pdf.mjs "/path/to/file.pdf"
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Usage: node scripts/extract-nxtsteps-pdf.mjs <file.pdf>");
  process.exit(1);
}

const buf = fs.readFileSync(path.resolve(pdfPath));
const data = await pdfParse(buf);
console.log(data.text);
