/**
 * Phase 12: Document completeness & validation engine – evaluate case readiness.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { getCaseById } from "@/lib/server/data";
import { getLatestRoutingRun } from "@/lib/server/routing";
import { getEffectiveStatus, type StoredApplication } from "@/lib/intake/fieldState";
import { aggregateRequirementsForPrograms } from "./requirements";
import {
  COMPLETENESS_ENGINE_VERSION,
  type CompletenessRunResult,
  type CompletenessIssue,
  type CompletenessOverallStatus,
  type ProgramCompletenessResult,
  type CompletenessSummaryCounts,
  type IssueType,
  type IssueSeverity,
} from "./types";
import type { ProgramRoutingResult } from "@/lib/server/routing/types";
import type { DocumentRow } from "@/lib/server/data/documents";

type CaseRecord = Record<string, unknown>;
type DocLike = { doc_type?: string; description?: string | null; status?: string };

/** Centralized severity for completeness issues. */
export function mapIssueSeverity(
  issueType: IssueType,
  context: { isCriticalField?: boolean; isRequiredDoc?: boolean }
): IssueSeverity {
  if (issueType === "missing_document") {
    return context.isRequiredDoc ? "blocking" : "warning";
  }
  if (issueType === "missing_field") {
    return context.isCriticalField ? "blocking" : "warning";
  }
  if (issueType === "inconsistency") {
    return "warning";
  }
  if (issueType === "warning") return "warning";
  return "informational";
}

function getNested(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Normalize for doc matching: lowercase, no spaces/underscores. */
function normalizeLabel(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
}

/** Whether a case document can be considered to satisfy a required document label. */
function docSatisfiesRequired(doc: DocLike, requiredLabel: string): boolean {
  const normReq = normalizeLabel(requiredLabel);
  if (!normReq) return false;
  const dt = (doc.doc_type ?? "").toString();
  const desc = (doc.description ?? "").toString();
  const normDt = normalizeLabel(dt);
  const normDesc = normalizeLabel(desc);
  if (normDt && (normReq === normDt || normDt.includes(normReq) || normReq.includes(normDt)))
    return true;
  if (normDesc && normDesc.includes(normReq)) return true;
  if (normReq.includes("polic") && (normDt.includes("polic") || normDesc.includes("polic")))
    return true;
  if (normReq.includes("medical") && (normDt.includes("medical") || normDesc.includes("medical")))
    return true;
  if (normReq.includes("proof") && (normDt.includes("proof") || normDt.includes("loss") || normDesc.includes("proof")))
    return true;
  return false;
}

/** Which required docs are covered by case documents (active/restricted only). */
function missingRequiredDocuments(
  requiredDocs: string[],
  documents: DocLike[]
): { missing: string[]; satisfied: string[] } {
  const satisfied: string[] = [];
  const missing: string[] = [];
  for (const req of requiredDocs) {
    const has = documents.some((d) => docSatisfiesRequired(d, req));
    if (has) satisfied.push(req);
    else missing.push(req);
  }
  return { missing, satisfied };
}

/** Field status from intake + _fieldState. */
function getFieldStatus(
  app: StoredApplication,
  fieldKey: string
): "answered" | "skipped" | "deferred" | "amended" | "unanswered" {
  const value = getNested(app as Record<string, unknown>, fieldKey);
  return getEffectiveStatus(app, fieldKey, value) as "answered" | "skipped" | "deferred" | "amended" | "unanswered";
}

/** Missing / skipped / deferred required fields. */
function requiredFieldsStatus(
  app: StoredApplication,
  requiredFields: string[]
): {
  missing: string[];
  skipped: string[];
  deferred: string[];
  answered: string[];
} {
  const missing: string[] = [];
  const skipped: string[] = [];
  const deferred: string[] = [];
  const answered: string[] = [];
  for (const key of requiredFields) {
    const status = getFieldStatus(app, key);
    const value = getNested(app as Record<string, unknown>, key);
    const empty = isEmpty(value);
    if (status === "unanswered" || (status === "answered" && empty) || (status === "amended" && empty))
      missing.push(key);
    else if (status === "skipped") skipped.push(key);
    else if (status === "deferred") deferred.push(key);
    else answered.push(key);
  }
  return { missing, skipped, deferred, answered };
}

/** Inconsistency checks v1 (no OCR). */
function detectInconsistencies(
  app: Record<string, unknown>,
  documents: DocLike[],
  programKey: string
): CompletenessIssue[] {
  const issues: CompletenessIssue[] = [];
  const losses = (app.losses ?? {}) as Record<string, unknown>;
  const crime = (app.crime ?? {}) as Record<string, unknown>;

  const hasMedicalDoc = documents.some(
    (d) => normalizeLabel((d.doc_type ?? "") + (d.description ?? "")).includes("medical")
  );
  const hasMedicalLoss = losses.medicalHospital === true || losses.counseling === true;
  if (hasMedicalDoc && !hasMedicalLoss) {
    issues.push({
      code: "DOC_MEDICAL_NO_LOSS",
      type: "inconsistency",
      severity: "warning",
      message: "Medical or counseling document uploaded but intake says no medical/counseling loss claimed.",
      program_key: programKey,
      resolution_hint: "Confirm loss type in intake or remove document if not applicable.",
    });
  }

  const hasPoliceDoc = documents.some(
    (d) =>
      normalizeLabel((d.doc_type ?? "") + (d.description ?? "")).includes("polic") ||
      normalizeLabel((d.doc_type ?? "") + (d.description ?? "")).includes("report")
  );
  const hasPoliceReportNumber = !isEmpty(crime.policeReportNumber);
  const hasReportingAgency = !isEmpty(crime.reportingAgency);
  if (hasPoliceDoc && !hasPoliceReportNumber && !hasReportingAgency) {
    issues.push({
      code: "DOC_POLICE_NO_REPORT_INFO",
      type: "inconsistency",
      severity: "warning",
      message: "Document that may be a police report is uploaded but intake has no police report number or reporting agency.",
      program_key: programKey,
      resolution_hint: "Add police report number and reporting agency in crime section, or clarify document type.",
    });
  }

  const docTypes = documents.map((d) => (d.doc_type ?? "").toLowerCase());
  const duplicateTypes = docTypes.filter((t, i) => t && docTypes.indexOf(t) !== i);
  if (duplicateTypes.length > 0) {
    issues.push({
      code: "DOC_DUPLICATE_TYPE",
      type: "informational",
      severity: "informational",
      message: `Multiple documents of the same type (${[...new Set(duplicateTypes)].join(", ")}). This may be intentional.`,
      program_key: programKey,
    });
  }

  return issues;
}

/** Evaluate one program's completeness. */
export function evaluateCompletenessForProgram(params: {
  caseRecord: CaseRecord;
  intake: StoredApplication;
  routingProgram: ProgramRoutingResult;
  documents: DocLike[];
  requirements: { required_documents: string[]; required_fields: string[] };
  programKey: string;
  programName: string;
}): ProgramCompletenessResult {
  const { intake, routingProgram, documents, requirements, programKey, programName } = params;
  const app = intake as Record<string, unknown>;
  const issues: CompletenessIssue[] = [];
  const missingDocs: string[] = [];
  const missingFields: string[] = [];

  const { missing: missingDocLabels } = missingRequiredDocuments(
    requirements.required_documents,
    documents
  );
  missingDocs.push(...missingDocLabels);
  for (const d of missingDocLabels) {
    issues.push({
      code: "MISSING_DOC",
      type: "missing_document",
      severity: mapIssueSeverity("missing_document", { isRequiredDoc: true }),
      message: `Required document not uploaded: ${d}`,
      document_type: d,
      program_key: programKey,
      resolution_hint: `Upload a document for: ${d}`,
    });
  }

  const fieldStatus = requiredFieldsStatus(intake, requirements.required_fields);
  missingFields.push(...fieldStatus.missing);
  for (const f of fieldStatus.missing) {
    issues.push({
      code: "MISSING_FIELD",
      type: "missing_field",
      severity: mapIssueSeverity("missing_field", { isCriticalField: true }),
      message: `Required information missing: ${f}`,
      field_key: f,
      program_key: programKey,
      resolution_hint: `Complete the intake step that includes ${f}.`,
    });
  }
  for (const f of fieldStatus.skipped) {
    issues.push({
      code: "FIELD_SKIPPED",
      type: "warning",
      severity: "warning",
      message: `Required field was skipped: ${f}`,
      field_key: f,
      program_key: programKey,
      resolution_hint: "Answer this question in the intake or note why it was skipped.",
    });
  }
  for (const f of fieldStatus.deferred) {
    issues.push({
      code: "FIELD_DEFERRED",
      type: "warning",
      severity: "warning",
      message: `Required field deferred (answer later): ${f}`,
      field_key: f,
      program_key: programKey,
      resolution_hint: "Complete this question before submission.",
    });
  }

  const inconsistencies = detectInconsistencies(app, documents, programKey);
  issues.push(...inconsistencies);

  if (
    (routingProgram.eligibility_status === "likely_eligible" || routingProgram.eligibility_status === "possibly_eligible") &&
    documents.length === 0 &&
    requirements.required_documents.length > 0
  ) {
    issues.push({
      code: "ROUTING_MATCH_NO_DOCS",
      type: "warning",
      severity: "blocking",
      message: "Case may be eligible for this program but no required documents have been uploaded yet.",
      program_key: programKey,
      resolution_hint: "Upload required documents listed above.",
    });
  }

  const status: CompletenessOverallStatus =
    missingDocs.length === 0 && missingFields.length === 0 && fieldStatus.skipped.length === 0 && fieldStatus.deferred.length === 0
      ? "complete"
      : missingDocs.length > 0 || missingFields.length > 0
        ? "incomplete"
        : "mostly_complete";

  const next_steps = [...routingProgram.next_steps];
  if (missingDocs.length > 0)
    next_steps.unshift(`Upload: ${missingDocs.slice(0, 3).join(", ")}${missingDocs.length > 3 ? " and others" : ""}.`);
  if (missingFields.length > 0)
    next_steps.unshift(`Complete intake: ${missingFields.slice(0, 2).join(", ")}${missingFields.length > 2 ? " and others" : ""}.`);

  return {
    program_key: programKey,
    program_name: programName,
    required_documents: requirements.required_documents,
    required_fields: requirements.required_fields,
    missing_documents: missingDocs,
    missing_fields: missingFields,
    inconsistencies,
    issues,
    status,
    next_steps: next_steps.length > 0 ? next_steps : ["Review program requirements and deadlines."],
  };
}

function deriveOverallStatus(programResults: ProgramCompletenessResult[]): CompletenessOverallStatus {
  if (programResults.length === 0) return "insufficient_information";
  const complete = programResults.filter((p) => p.status === "complete").length;
  const incomplete = programResults.filter((p) => p.status === "incomplete").length;
  const mostly = programResults.filter((p) => p.status === "mostly_complete").length;
  if (incomplete > 0 && complete === 0) return "incomplete";
  if (complete === programResults.length) return "complete";
  if (mostly > 0 || complete > 0) return "mostly_complete";
  return "incomplete";
}

function buildSummaryCounts(
  allIssues: CompletenessIssue[],
  missingItems: CompletenessIssue[]
): CompletenessSummaryCounts {
  let blocking = 0;
  let warning = 0;
  let informational = 0;
  for (const i of allIssues) {
    if (i.severity === "blocking") blocking++;
    else if (i.severity === "warning") warning++;
    else informational++;
  }
  return {
    missing_count: missingItems.length,
    blocking_count: blocking,
    warning_count: warning,
    informational_count: informational,
  };
}

export type RunCompletenessParams = {
  caseId: string;
  ctx: import("@/lib/server/auth").AuthContext;
  dryRun?: boolean;
};

/** Run completeness evaluation for a case. Requires latest routing run. */
export async function runCompletenessEvaluation(
  params: RunCompletenessParams
): Promise<CompletenessRunResult> {
  const { caseId, ctx, dryRun = false } = params;
  const caseResult = await getCaseById({ caseId, ctx });
  if (!caseResult) throw new AppError("NOT_FOUND", "Case not found", undefined, 404);

  const routing = await getLatestRoutingRun({ caseId, ctx });
  if (!routing?.result?.programs?.length) {
    throw new AppError(
      "VALIDATION_ERROR",
      "No routing result found for this case. Run program routing first (Evaluate programs).",
      undefined,
      422
    );
  }

  const intake = (caseResult.case.application ?? {}) as StoredApplication;
  const documents = (caseResult.documents ?? []) as DocumentRow[];
  const docsForEval = documents.filter((d) => d.status !== "deleted") as DocLike[];

  const stateCode =
    (getNested(caseResult.case.application as Record<string, unknown>, "victim.state") as string) || undefined;
  const requirementsList = await aggregateRequirementsForPrograms(routing.result.programs, stateCode);

  const programResults: ProgramCompletenessResult[] = [];
  const allIssues: CompletenessIssue[] = [];
  const missingItems: CompletenessIssue[] = [];
  const inconsistencies: CompletenessIssue[] = [];

  for (let i = 0; i < routing.result.programs.length; i++) {
    const prog = routing.result.programs[i];
    const req = requirementsList.find((r) => r.program_key === prog.program_key) ?? {
      program_key: prog.program_key,
      program_name: prog.program_name,
      required_documents: prog.required_documents?.length ? prog.required_documents : ["Police report", "Proof of loss"],
      required_fields: requirementsList[0]?.required_fields ?? [],
    };
    const reqFields = req.required_fields.length > 0 ? req.required_fields : requirementsList[0]?.required_fields ?? [];
    const evalResult = evaluateCompletenessForProgram({
      caseRecord: caseResult.case as CaseRecord,
      intake,
      routingProgram: prog,
      documents: docsForEval,
      requirements: { required_documents: req.required_documents, required_fields: reqFields },
      programKey: prog.program_key,
      programName: prog.program_name,
    });
    programResults.push(evalResult);
    for (const issue of evalResult.issues) {
      allIssues.push(issue);
      if (issue.type === "missing_document" || issue.type === "missing_field") missingItems.push(issue);
      if (issue.type === "inconsistency") inconsistencies.push(issue);
    }
  }

  const overall_status = deriveOverallStatus(programResults);
  const summary_counts = buildSummaryCounts(allIssues, missingItems);

  const recommended_next_actions: string[] = [];
  if (missingItems.some((m) => m.severity === "blocking")) {
    recommended_next_actions.push("Upload missing required documents and complete required intake fields.");
  }
  if (inconsistencies.length > 0) {
    recommended_next_actions.push("Review inconsistencies between intake answers and uploaded documents.");
  }
  for (const p of programResults) {
    if (p.next_steps.length > 0) recommended_next_actions.push(`${p.program_name}: ${p.next_steps[0]}`);
  }
  if (recommended_next_actions.length === 0) {
    recommended_next_actions.push("Case appears complete for evaluated programs. Review deadlines and submit when ready.");
  }

  const runResult: CompletenessRunResult = {
    overall_status,
    program_results: programResults,
    missing_items: missingItems,
    inconsistencies,
    issues: allIssues,
    recommended_next_actions: [...new Set(recommended_next_actions)].slice(0, 10),
    summary_counts,
    evaluated_at: new Date().toISOString(),
    engine_version: COMPLETENESS_ENGINE_VERSION,
  };

  if (!dryRun) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("completeness_runs").insert({
      case_id: caseId,
      organization_id: caseResult.case.organization_id,
      actor_user_id: ctx.userId,
      routing_run_id: routing.run.id,
      engine_version: COMPLETENESS_ENGINE_VERSION,
      status: "completed",
      result: runResult as unknown as Record<string, unknown>,
    });
    if (error) throw new AppError("INTERNAL", "Failed to save completeness run", undefined, 500);
  }

  return runResult;
}

/** Get latest completeness run for a case (with access check). */
export async function getLatestCompletenessRun(params: {
  caseId: string;
  ctx: import("@/lib/server/auth").AuthContext;
}): Promise<{ run: { id: string; created_at: string; result: CompletenessRunResult }; result: CompletenessRunResult } | null> {
  const { caseId, ctx } = params;
  const caseResult = await getCaseById({ caseId, ctx });
  if (!caseResult) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("completeness_runs")
    .select("id, created_at, result")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    run: { id: data.id, created_at: data.created_at, result: data.result as CompletenessRunResult },
    result: data.result as CompletenessRunResult,
  };
}
