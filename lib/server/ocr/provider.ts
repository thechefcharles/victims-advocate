/**
 * Phase 13: OCR provider abstraction. v1: stub that returns placeholder text for pipeline testing.
 * Replace runOcrOnDocument implementation with a real OCR service (e.g. Document AI, Tesseract, Textract).
 */

import type { OcrProviderResult } from "./types";

const BUCKET = "case-documents";

/**
 * Run OCR on document content. Returns raw text and metadata.
 * v1: Stub implementation – does not call an external OCR API.
 * Caller should download file from storage and pass buffer for real OCR.
 * For production, replace this with a call to Document AI, Textract, pdf-parse, etc.
 */
export async function runOcrOnDocument(params: {
  buffer?: ArrayBuffer | Buffer | null;
  storagePath: string;
  mimeType: string | null;
  docType?: string | null;
  fileName?: string | null;
}): Promise<OcrProviderResult> {
  const { mimeType } = params;

  const supported =
    mimeType === "application/pdf" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/heic";
  if (!supported) {
    return {
      rawText: "",
      provider: "stub",
      model: null,
      confidence: 0,
      segments: [],
    };
  }

  // v1 stub: return sample text so extraction rules produce example fields.
  // In production, download from storage and run real OCR here.
  const stubText = [
    "Police Report # 2024-5678",
    "Date: 01/15/2024",
    "Reporting Agency: Metro Police Department",
    "Incident Report",
    "Claimant: Jane Doe",
    "Provider: City Medical Center",
    "Total Amount: $1,250.00",
    "Service Date: 01/16/2024",
  ].join("\n");

  return {
    rawText: stubText,
    provider: "stub",
    model: "v1",
    confidence: 0.5,
    segments: [{ text: stubText, page: 1 }],
  };
}
