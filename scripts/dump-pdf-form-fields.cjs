#!/usr/bin/env node
/**
 * Dump AcroForm field names (and types) from a fillable PDF.
 * Use this to get the real field names for building a state PDF field map.
 *
 * Usage:
 *   node scripts/dump-pdf-form-fields.cjs "/path/to/form.pdf"
 *   node scripts/dump-pdf-form-fields.cjs public/pdf/indiana_cvc_application.pdf
 */

const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Usage: node scripts/dump-pdf-form-fields.cjs <path-to-pdf>");
  process.exit(1);
}

const resolved = path.resolve(process.cwd(), pdfPath);
if (!fs.existsSync(resolved)) {
  console.error("File not found:", resolved);
  process.exit(1);
}

(async () => {
  const bytes = fs.readFileSync(resolved);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log("PDF:", resolved);
  console.log("Total form fields:", fields.length);
  console.log("");

  const byType = {};
  fields.forEach((f) => {
    const name = f.getName();
    const type = f.constructor.name;
    byType[type] = (byType[type] || 0) + 1;
    console.log(`${name} (${type})`);
  });

  console.log("");
  console.log("By type:", byType);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
