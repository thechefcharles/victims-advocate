/**
 * Phase 13: OCR run orchestration – run OCR, extract fields, persist, detect inconsistencies.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCaseById } from "@/lib/server/data";
import { assertDocumentAccess } from "@/lib/server/data/documents";
import { AppError } from "@/lib/server/api";
import { sha256Hex } from "@/lib/server/audit/hash";
import { runOcrOnDocument } from "./provider";
import { extractFieldsFromText } from "./extract";
import { inferDocTypeFromText } from "./documentTypes";
import type { OcrResultSummary, OcrRunStatus, ExtractedFieldStatus } from "./types";
import type { AuthContext } from "@/lib/server/auth";
import type { DocumentRow } from "@/lib/server/data/documents";

const BUCKET = "case-documents";

/** Detect inconsistencies between OCR-extracted fields and case intake. Do not overwrite intake. */
function detectOcrIntakeInconsistencies(
  extractedFields: Array<{ field_key: string; value_text: string | null; value_number: number | null; value_date: string | null }>,
  intake: Record<string, unknown>
): OcrResultSummary["inconsistencies"] {
  const inconsistencies: NonNullable<OcrResultSummary["inconsistencies"]> = [];

  const getIntake = (path: string): unknown => {
    const parts = path.split(".");
    let cur: unknown = intake;
    for (const p of parts) {
      if (cur == null || typeof cur !== "object") return undefined;
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
  };

  for (const f of extractedFields) {
    if (f.field_key === "police_report.report_number" && f.value_text) {
      const intakeVal = getIntake("crime.policeReportNumber") as string | undefined;
      if (intakeVal && intakeVal.trim() !== "" && intakeVal.trim() !== f.value_text.trim()) {
        inconsistencies.push({
          code: "OCR_INTAKE_REPORT_NUMBER_MISMATCH",
          message: `OCR found report number "${f.value_text}" but intake has "${intakeVal}".`,
          field_key: "crime.policeReportNumber",
        });
      }
    }
    if (f.field_key === "crime.date" && f.value_date) {
      const intakeVal = getIntake("crime.dateOfCrime") as string | undefined;
      if (intakeVal && intakeVal !== f.value_date) {
        inconsistencies.push({
          code: "OCR_INTAKE_DATE_MISMATCH",
          message: `OCR found date ${f.value_date} but intake has ${intakeVal}.`,
          field_key: "crime.dateOfCrime",
        });
      }
    }
    if (f.field_key === "expense.amount" && f.value_number != null) {
      const medical = (intake.medical as { providers?: Array<{ amountOfBill?: number }> })?.providers;
      const amounts = medical?.map((p) => p.amountOfBill).filter((n): n is number => typeof n === "number") ?? [];
      if (amounts.length > 0 && !amounts.includes(f.value_number)) {
        const close = amounts.some((a) => Math.abs(a - f.value_number!) < 0.02);
        if (!close) {
          inconsistencies.push({
            code: "OCR_INTAKE_AMOUNT_MISMATCH",
            message: `OCR found amount $${f.value_number} which does not match entered amounts.`,
            field_key: "expense.amount",
          });
        }
      }
    }
    if (f.field_key === "provider.name" && f.value_text) {
      const medical = (intake.medical as { providers?: Array<{ providerName?: string }> })?.providers;
      const names = medical?.map((p) => (p.providerName ?? "").toLowerCase()).filter(Boolean) ?? [];
      const ocrLower = f.value_text.toLowerCase();
      if (names.length > 0 && !names.some((n) => ocrLower.includes(n) || n.includes(ocrLower))) {
        inconsistencies.push({
          code: "OCR_INTAKE_PROVIDER_MISMATCH",
          message: `OCR found provider "${f.value_text}" which may not match intake.`,
          field_key: "provider.name",
        });
      }
    }
  }

  return inconsistencies;
}

export type RunOcrParams = {
  documentId: string;
  ctx: AuthContext;
  forceRerun?: boolean;
};

/**
 * Run OCR for a document: download, run provider, extract fields, persist run + fields, detect inconsistencies.
 * Does not overwrite intake. Requires document to be attached to a case and user to have access.
 */
export async function runOcrForDocument(params: RunOcrParams): Promise<{
  runId: string;
  status: OcrRunStatus;
  resultSummary: OcrResultSummary;
  fieldCount: number;
}> {
  const { documentId, ctx, forceRerun = false } = params;

  const doc = await assertDocumentAccess({ documentId, ctx, accessType: "view" });
  const caseId = doc.case_id;
  if (!caseId) throw new AppError("FORBIDDEN", "Document must be attached to a case for OCR", undefined, 403);

  const mime = (doc.mime_type ?? "").toString();
  const supported = ["application/pdf", "image/jpeg", "image/png", "image/heic"].includes(mime);
  if (!supported) {
    throw new AppError(
      "VALIDATION_ERROR",
      "OCR is only supported for PDF and image (JPEG, PNG, HEIC) documents",
      undefined,
      422
    );
  }

  const supabase = getSupabaseAdmin();

  if (!forceRerun) {
    const { data: recent } = await supabase
      .from("ocr_runs")
      .select("id, status")
      .eq("document_id", documentId)
      .in("status", ["processing", "completed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent && (recent as { status: string }).status === "processing") {
      throw new AppError("VALIDATION_ERROR", "An OCR run is already in progress for this document", undefined, 409);
    }
    if (recent && (recent as { status: string }).status === "completed") {
      const run = recent as { id: string };
      const { count } = await supabase
        .from("ocr_extracted_fields")
        .select("id", { count: "exact", head: true })
        .eq("ocr_run_id", run.id);
      const { data: r } = await supabase
        .from("ocr_runs")
        .select("result_summary")
        .eq("id", run.id)
        .single();
      return {
        runId: run.id,
        status: "completed",
        resultSummary: (r as { result_summary: OcrResultSummary })?.result_summary ?? {},
        fieldCount: count ?? 0,
      };
    }
  }

  const { data: runRow, error: insertErr } = await supabase
    .from("ocr_runs")
    .insert({
      document_id: documentId,
      case_id: caseId,
      organization_id: doc.organization_id,
      actor_user_id: ctx.userId,
      status: "processing",
      result_summary: {},
    })
    .select("id")
    .single();

  if (insertErr || !runRow) throw new AppError("INTERNAL", "Failed to create OCR run", undefined, 500);
  const runId = (runRow as { id: string }).id;

  let rawText = "";
  let provider = "stub";
  let model: string | null = null;
  let failureReason: string | null = null;

  try {
    const { data: blob } = await supabase.storage.from(BUCKET).download(doc.storage_path);
    const buffer = blob ? await blob.arrayBuffer() : null;

    const result = await runOcrOnDocument({
      buffer: buffer ?? undefined,
      storagePath: doc.storage_path,
      mimeType: mime || null,
      docType: doc.doc_type ?? null,
      fileName: doc.file_name ?? null,
    });

    rawText = result.rawText;
    provider = result.provider;
    model = result.model ?? null;
  } catch (e) {
    failureReason = e instanceof Error ? e.message : String(e);
    await supabase
      .from("ocr_runs")
      .update({
        status: "failed",
        failure_reason: failureReason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId);
    throw new AppError("INTERNAL", `OCR failed: ${failureReason}`, undefined, 500);
  }

  const hash = rawText ? await sha256Hex(rawText) : null;
  const rawTextLength = rawText.length;

  const extracted = extractFieldsFromText(rawText);
  const inferredType = inferDocTypeFromText(rawText, doc.file_name ?? "");
  const userDocType = (doc.doc_type ?? "").toString().toLowerCase();
  const typeMismatch =
    inferredType && userDocType && inferredType !== userDocType;

  const caseResult = await getCaseById({ caseId, ctx });
  const application = (caseResult?.case?.application ?? {}) as Record<string, unknown>;
  const inconsistencies = detectOcrIntakeInconsistencies(
    extracted.map((f) => ({
      field_key: f.field_key,
      value_text: f.value_text,
      value_number: f.value_number,
      value_date: f.value_date,
    })),
    application
  );

  const inconsistenciesList = inconsistencies ?? [];
  const resultSummary: OcrResultSummary = {
    inferred_doc_type: inferredType ?? null,
    type_mismatch: typeMismatch || undefined,
    inconsistencies: inconsistenciesList.length > 0 ? inconsistenciesList : undefined,
    warnings:
      extracted.length === 0 && rawText.length > 0
        ? ["No structured fields could be extracted from this document."]
        : undefined,
  };

  for (const f of extracted) {
    await supabase.from("ocr_extracted_fields").insert({
      ocr_run_id: runId,
      document_id: documentId,
      case_id: caseId,
      organization_id: doc.organization_id,
      field_key: f.field_key,
      field_label: f.field_label,
      value_text: f.value_text,
      value_number: f.value_number,
      value_date: f.value_date,
      normalized_value: {},
      confidence_score: f.confidence_score,
      status: "extracted",
      source_region: f.source_region ?? {},
    });
  }

  await supabase
    .from("ocr_runs")
    .update({
      status: extracted.length === 0 && inconsistenciesList.length > 0 ? "needs_review" : "completed",
      ocr_provider: provider,
      ocr_model: model,
      raw_text_hash: hash,
      raw_text_length: rawTextLength,
      failure_reason: null,
      result_summary: resultSummary as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId);

  return {
    runId,
    status: "completed",
    resultSummary,
    fieldCount: extracted.length,
  };
}

/** Get latest OCR run and extracted fields for a document. */
export async function getLatestOcrForDocument(params: {
  documentId: string;
  ctx: AuthContext;
}): Promise<{
  run: {
    id: string;
    status: OcrRunStatus;
    result_summary: OcrResultSummary;
    created_at: string;
    ocr_provider: string | null;
  };
  fields: Array<{
    id: string;
    field_key: string;
    field_label: string | null;
    value_text: string | null;
    value_number: number | null;
    value_date: string | null;
    confidence_score: number | null;
    status: ExtractedFieldStatus;
  }>;
} | null> {
  const { documentId, ctx } = params;
  await assertDocumentAccess({ documentId, ctx, accessType: "view" });

  const supabase = getSupabaseAdmin();
  const { data: runData, error: runErr } = await supabase
    .from("ocr_runs")
    .select("id, status, result_summary, created_at, ocr_provider")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runErr || !runData) return null;

  const { data: fieldsData } = await supabase
    .from("ocr_extracted_fields")
    .select("id, field_key, field_label, value_text, value_number, value_date, confidence_score, status")
    .eq("ocr_run_id", (runData as { id: string }).id)
    .order("field_key");

  return {
    run: {
      id: (runData as { id: string }).id,
      status: (runData as { status: OcrRunStatus }).status,
      result_summary: (runData as { result_summary: OcrResultSummary }).result_summary ?? {},
      created_at: (runData as { created_at: string }).created_at,
      ocr_provider: (runData as { ocr_provider: string | null }).ocr_provider,
    },
    fields: (fieldsData ?? []) as Array<{
      id: string;
      field_key: string;
      field_label: string | null;
      value_text: string | null;
      value_number: number | null;
      value_date: string | null;
      confidence_score: number | null;
      status: ExtractedFieldStatus;
    }>,
  };
}

/**
 * Phase 13: Optional enrichment for completeness – return confirmed/corrected OCR fields for a case.
 * Completeness engine can use these as read-only signals for inconsistency messaging (Phase 12/13.5).
 */
export async function getConfirmedOcrFieldsForCase(params: {
  caseId: string;
  ctx: AuthContext;
}): Promise<Array<{ field_key: string; value_text: string | null; value_number: number | null; value_date: string | null }>> {
  const { caseId, ctx } = params;
  const caseResult = await getCaseById({ caseId, ctx });
  if (!caseResult) return [];

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("ocr_extracted_fields")
    .select("field_key, value_text, value_number, value_date")
    .eq("case_id", caseId)
    .in("status", ["confirmed", "corrected"]);

  return (data ?? []) as Array<{ field_key: string; value_text: string | null; value_number: number | null; value_date: string | null }>;
}
