/**
 * Phase 13: OCR & document parsing – types.
 */

export type OcrRunStatus = "queued" | "processing" | "completed" | "failed" | "needs_review";

export type ExtractedFieldStatus = "extracted" | "confirmed" | "corrected" | "rejected";

export interface OcrProviderResult {
  rawText: string;
  provider: string;
  model: string | null;
  confidence?: number | null;
  segments?: Array<{ text: string; page?: number; region?: unknown }>;
}

export interface ExtractedFieldCandidate {
  field_key: string;
  field_label: string | null;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null; // YYYY-MM-DD
  confidence_score: number | null;
  source_region?: Record<string, unknown>;
}

export interface OcrResultSummary {
  inferred_doc_type?: string | null;
  type_mismatch?: boolean;
  inconsistencies?: Array<{ code: string; message: string; field_key?: string }>;
  warnings?: string[];
}

export interface OcrRunRow {
  id: string;
  created_at: string;
  updated_at: string;
  document_id: string;
  case_id: string;
  organization_id: string;
  actor_user_id: string | null;
  status: OcrRunStatus;
  ocr_provider: string | null;
  ocr_model: string | null;
  raw_text_hash: string | null;
  raw_text_length: number | null;
  failure_reason: string | null;
  result_summary: OcrResultSummary | Record<string, unknown>;
}

export interface OcrExtractedFieldRow {
  id: string;
  created_at: string;
  updated_at: string;
  ocr_run_id: string;
  document_id: string;
  case_id: string;
  organization_id: string;
  field_key: string;
  field_label: string | null;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  normalized_value: Record<string, unknown>;
  confidence_score: number | null;
  status: ExtractedFieldStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  correction_reason: string | null;
  source_region: Record<string, unknown>;
}

/** Supported MIME types for OCR in v1. */
export const OCR_SUPPORTED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
] as const;

export const OCR_SUPPORTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".heic"] as const;
