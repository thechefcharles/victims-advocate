/**
 * Phase 11: Routing engine – evaluate intake against program definitions.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCaseById } from "@/lib/server/data";
import { getKnowledgeEntriesForContext } from "@/lib/server/knowledge/retrieval";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import {
  ENGINE_VERSION,
  type ProgramDefinitionRow,
  type ProgramRoutingResult,
  type RoutingRunResult,
  type EligibilityStatus,
  type ConfidenceLevel,
  type RuleSet,
} from "./types";
import { evaluateRuleSetFull, type IntakeLike } from "./rules";

/** Strip _fieldState and other internal keys from application for routing. */
export function intakeFromApplication(application: unknown): IntakeLike {
  if (application == null || typeof application !== "object") return {};
  const obj = application as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "_fieldState" || k.startsWith("_")) continue;
    out[k] = v;
  }
  return out as IntakeLike;
}

function deriveEligibilityAndConfidence(
  matched: { length: number },
  failed: { length: number },
  unknown: { length: number },
  ruleSetEmpty: boolean
): { status: EligibilityStatus; confidence: ConfidenceLevel } {
  if (ruleSetEmpty) {
    return { status: "insufficient_information", confidence: "low" };
  }
  if (failed.length > 0) {
    return {
      status: "unlikely_eligible",
      confidence: unknown.length > 0 ? "medium" : "high",
    };
  }
  if (unknown.length > 0) {
    const total = matched.length + unknown.length;
    const knownRatio = matched.length / total;
    return {
      status: knownRatio >= 0.5 ? "possibly_eligible" : "insufficient_information",
      confidence: knownRatio >= 0.7 ? "medium" : "low",
    };
  }
  return { status: "likely_eligible", confidence: "high" };
}

function buildMissingRequirements(failed: ProgramRoutingResult["failed_conditions"], unknown: ProgramRoutingResult["unknown_conditions"]): string[] {
  const out: string[] = [];
  for (const c of failed) {
    out.push(`Required: ${c.field} ${c.op} ${c.value != null ? String(c.value) : ""} (current value did not match)`);
  }
  for (const c of unknown) {
    out.push(`Unknown: ${c.field} (value missing or not yet provided)`);
  }
  return out;
}

function buildNextSteps(status: EligibilityStatus, missing: string[]): string[] {
  const steps: string[] = [];
  if (missing.length > 0) {
    steps.push("Complete intake fields that affect eligibility so we can refine this result.");
  }
  if (status === "possibly_eligible" || status === "insufficient_information") {
    steps.push("Review required documents and deadlines below.");
  }
  if (status === "unlikely_eligible") {
    steps.push("Eligibility rules did not match; review failed conditions or contact program for clarification.");
  }
  return steps.length > 0 ? steps : ["No additional steps at this time."];
}

/** Evaluate one program against intake. */
export function evaluateProgram(params: {
  intake: IntakeLike;
  programDefinition: ProgramDefinitionRow;
  kbDocuments?: string[];
  kbDeadlineSummary?: string | null;
  kbNextSteps?: string[];
}): ProgramRoutingResult {
  const { intake, programDefinition, kbDocuments, kbDeadlineSummary, kbNextSteps } = params;
  const ruleSet = (programDefinition.rule_set ?? {}) as RuleSet;
  const all = ruleSet.all ?? [];
  const any = ruleSet.any ?? [];
  const ruleSetEmpty = all.length === 0 && any.length === 0;

  const { matched, failed, unknown, passed } = ruleSetEmpty
    ? { matched: [], failed: [], unknown: [], passed: false }
    : evaluateRuleSetFull(intake, ruleSet);

  const { status, confidence } = deriveEligibilityAndConfidence(
    matched,
    failed,
    unknown,
    ruleSetEmpty
  );
  const missingRequirements = buildMissingRequirements(failed, unknown);
  const nextSteps = buildNextSteps(status, missingRequirements);
  const requiredDocuments = Array.isArray(programDefinition.required_documents)
    ? programDefinition.required_documents.map((d) => (typeof d === "string" ? d : (d as { name?: string }).name ?? String(d)))
    : [];
  const kbDocs = kbDocuments?.length ? kbDocuments : requiredDocuments;

  return {
    program_key: programDefinition.program_key,
    program_name: programDefinition.name,
    eligibility_status: status,
    matched_conditions: matched,
    failed_conditions: failed,
    unknown_conditions: unknown,
    missing_requirements: missingRequirements,
    next_steps: kbNextSteps?.length ? kbNextSteps : nextSteps,
    confidence,
    deadline_summary: kbDeadlineSummary ?? (programDefinition.deadline_metadata as { summary?: string })?.summary ?? null,
    required_documents: kbDocs.length ? kbDocs : requiredDocuments,
    explanation: programDefinition.description ?? undefined,
  };
}

/** Load active program definitions from DB. */
export async function getActiveProgramDefinitions(): Promise<ProgramDefinitionRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("program_definitions")
    .select("*")
    .eq("is_active", true)
    .order("program_key");
  if (error) throw new AppError("INTERNAL", "Failed to load program definitions", undefined, 500);
  return (data ?? []) as ProgramDefinitionRow[];
}

/** Enrich routing result with KB entries (documents, timeline, program_overview). */
export async function enrichFromKnowledge(
  programKey: string,
  stateCode: string | null
): Promise<{ documents: string[]; deadlineSummary: string | null; nextSteps: string[] }> {
  const documents: string[] = [];
  let deadlineSummary: string | null = null;
  const nextSteps: string[] = [];

  const docEntries = await getKnowledgeEntriesForContext({
    category: "documents",
    stateCode: stateCode ?? undefined,
    programKey,
    limit: 5,
  });
  for (const e of docEntries) {
    const title = (e as { title?: string }).title;
    if (title) documents.push(title);
  }

  const timelineEntries = await getKnowledgeEntriesForContext({
    category: "timeline",
    stateCode: stateCode ?? undefined,
    programKey,
    limit: 3,
  });
  for (const e of timelineEntries) {
    const body = (e as { body?: string }).body;
    if (body && !deadlineSummary) deadlineSummary = body;
  }

  const overviewEntries = await getKnowledgeEntriesForContext({
    category: "program_overview",
    stateCode: stateCode ?? undefined,
    programKey,
    limit: 2,
  });
  for (const e of overviewEntries) {
    const body = (e as { body?: string }).body;
    if (body) nextSteps.push(body);
  }

  return { documents, deadlineSummary, nextSteps };
}

/** Sort program results by strongest match (likely_eligible first, then possibly, then insufficient, then unlikely). */
const statusOrder: EligibilityStatus[] = [
  "likely_eligible",
  "possibly_eligible",
  "insufficient_information",
  "unlikely_eligible",
];
function sortByStrongestMatch(programs: ProgramRoutingResult[]): ProgramRoutingResult[] {
  return [...programs].sort(
    (a, b) => statusOrder.indexOf(a.eligibility_status) - statusOrder.indexOf(b.eligibility_status)
  );
}

export type RunRoutingParams = {
  caseId: string;
  ctx: AuthContext;
  dryRun?: boolean;
};

/** Run routing for a case: load intake, evaluate all active programs, optionally persist. */
export async function runRouting(params: RunRoutingParams): Promise<RoutingRunResult> {
  const { caseId, ctx, dryRun = false } = params;
  const result = await getCaseById({ caseId, ctx });
  if (!result) throw new AppError("NOT_FOUND", "Case not found", undefined, 404);

  const application = result.case.application as unknown;
  const intake = intakeFromApplication(application);
  const programs = await getActiveProgramDefinitions();

  const programResults: ProgramRoutingResult[] = [];
  for (const def of programs) {
    const kb = await enrichFromKnowledge(def.program_key, def.state_code);
    const pr = evaluateProgram({
      intake,
      programDefinition: def,
      kbDocuments: kb.documents.length ? kb.documents : undefined,
      kbDeadlineSummary: kb.deadlineSummary,
      kbNextSteps: kb.nextSteps.length ? kb.nextSteps : undefined,
    });
    programResults.push(pr);
  }

  const sorted = sortByStrongestMatch(programResults);
  const runResult: RoutingRunResult = {
    engine_version: ENGINE_VERSION,
    programs: sorted,
    evaluated_at: new Date().toISOString(),
  };

  if (!dryRun) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("routing_runs").insert({
      case_id: caseId,
      organization_id: result.case.organization_id,
      actor_user_id: ctx.userId,
      intake_version: null,
      knowledge_version_summary: {},
      engine_version: ENGINE_VERSION,
      status: "completed",
      result: runResult as unknown as Record<string, unknown>,
    });
    if (error) throw new AppError("INTERNAL", "Failed to save routing run", undefined, 500);
  }

  return runResult;
}

/** Get latest routing run for a case (with access check). */
export async function getLatestRoutingRun(params: {
  caseId: string;
  ctx: AuthContext;
}): Promise<{ run: { id: string; created_at: string; result: RoutingRunResult }; result: RoutingRunResult } | null> {
  const { caseId, ctx } = params;
  const result = await getCaseById({ caseId, ctx });
  if (!result) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("routing_runs")
    .select("id, created_at, result")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new AppError("INTERNAL", "Failed to load routing run", undefined, 500);
  if (!data) return null;

  return {
    run: {
      id: data.id,
      created_at: data.created_at,
      result: data.result as RoutingRunResult,
    },
    result: data.result as RoutingRunResult,
  };
}
