/**
 * Domain 6.1 — Trust repository.
 *
 * The single data-access layer for the trust scoring tables. Services NEVER
 * call supabase directly — every read and write goes through this module.
 *
 * **Search Law alignment**: this repository reads `trust_signal_aggregates`
 * (the only permitted source for score inputs) and writes the scoring tables.
 * It must never read from `cases`, `programs`, `cvc_applications`, or any
 * raw workflow table — those reads are forbidden in the scoring pipeline.
 *
 * Row mappers translate snake_case DB rows into camelCase domain types so
 * the upstream services see only canonical interfaces.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import type {
  ProviderAffiliationStatus,
  ProviderAffiliationStatusType,
  ProviderReliabilitySummary,
  ProviderScoreInput,
  ProviderScoreSnapshot,
  ReliabilityTier,
  ScoreDispute,
  ScoreDisputeOutcome,
  ScoreDisputeStatus,
  ScoreMethodology,
  ScoreMethodologyStatus,
  ScoreSnapshotStatus,
} from "./trustTypes";

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function rowToMethodology(row: Record<string, unknown>): ScoreMethodology {
  return {
    id: String(row.id),
    version: String(row.version),
    name: String(row.name),
    description: row.description != null ? String(row.description) : null,
    status: row.status as ScoreMethodologyStatus,
    categoryDefinitions: Array.isArray(row.category_definitions)
      ? (row.category_definitions as ScoreMethodology["categoryDefinitions"])
      : [],
    weights: (row.weights as Record<string, number>) ?? {},
    createdByUserId:
      row.created_by_user_id != null ? String(row.created_by_user_id) : null,
    publishedAt: row.published_at != null ? String(row.published_at) : null,
    deprecatedAt: row.deprecated_at != null ? String(row.deprecated_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToSnapshot(row: Record<string, unknown>): ProviderScoreSnapshot {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    methodologyId: String(row.methodology_id),
    methodologyVersion: String(row.methodology_version),
    categoryScores: (row.category_scores as Record<string, number>) ?? {},
    weightedComposite: Number(row.weighted_composite),
    scoreStatus: row.score_status as ScoreSnapshotStatus,
    calcMetadata: (row.calc_metadata as Record<string, unknown>) ?? {},
    computedAt: String(row.computed_at),
    createdAt: String(row.created_at),
  };
}

function rowToInput(row: Record<string, unknown>): ProviderScoreInput {
  return {
    id: String(row.id),
    snapshotId: String(row.snapshot_id),
    organizationId: String(row.organization_id),
    category: String(row.category),
    signalType: String(row.signal_type),
    rawValue: Number(row.raw_value),
    normalizedValue: Number(row.normalized_value),
    weight: Number(row.weight),
    contribution: Number(row.contribution),
    source: String(row.source),
    createdAt: String(row.created_at),
  };
}

function rowToSummary(row: Record<string, unknown>): ProviderReliabilitySummary {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    snapshotId: String(row.snapshot_id),
    reliabilityTier: row.reliability_tier as ReliabilityTier,
    highlights: Array.isArray(row.highlights) ? (row.highlights as string[]) : [],
    availabilitySummary:
      row.availability_summary != null ? String(row.availability_summary) : null,
    languageSummary:
      row.language_summary != null ? String(row.language_summary) : null,
    freshness: String(row.freshness),
    isCurrent: Boolean(row.is_current),
    computedAt: String(row.computed_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToDispute(row: Record<string, unknown>): ScoreDispute {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    snapshotId: String(row.snapshot_id),
    status: row.status as ScoreDisputeStatus,
    reason: String(row.reason),
    evidence: (row.evidence as Record<string, unknown>) ?? {},
    openedByUserId: String(row.opened_by_user_id),
    openedAt: String(row.opened_at),
    reviewedByUserId:
      row.reviewed_by_user_id != null ? String(row.reviewed_by_user_id) : null,
    reviewedAt: row.reviewed_at != null ? String(row.reviewed_at) : null,
    resolutionNotes:
      row.resolution_notes != null ? String(row.resolution_notes) : null,
    resolutionOutcome:
      row.resolution_outcome != null
        ? (row.resolution_outcome as ScoreDisputeOutcome)
        : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToAffiliation(row: Record<string, unknown>): ProviderAffiliationStatus {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    status: row.status as ProviderAffiliationStatusType,
    reason: row.reason != null ? String(row.reason) : null,
    notes: row.notes != null ? String(row.notes) : null,
    setByUserId: String(row.set_by_user_id),
    setAt: String(row.set_at),
    isCurrent: Boolean(row.is_current),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

// ---------------------------------------------------------------------------
// Trust signal aggregates — read-only consumer (Domain 0.5)
// ---------------------------------------------------------------------------

export interface TrustSignalAggregateRow {
  signalType: string;
  totalCount: number;
  totalValue: number;
  lastEventAt: string | null;
}

/**
 * Read all trust signal aggregates for an organization. This is the ONLY
 * source the scoring pipeline is permitted to consume — see Search Law.
 */
export async function getTrustSignalAggregates(
  organizationId: string,
  supabase: SupabaseClient,
): Promise<TrustSignalAggregateRow[]> {
  const { data, error } = await supabase
    .from("trust_signal_aggregates")
    .select("signal_type, total_count, total_value, last_event_at")
    .eq("org_id", organizationId);
  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to read trust_signal_aggregates: ${error.message}`,
    );
  }
  return (data ?? []).map((row) => ({
    signalType: String((row as Record<string, unknown>).signal_type),
    totalCount: Number((row as Record<string, unknown>).total_count ?? 0),
    totalValue: Number((row as Record<string, unknown>).total_value ?? 0),
    lastEventAt:
      (row as Record<string, unknown>).last_event_at != null
        ? String((row as Record<string, unknown>).last_event_at)
        : null,
  }));
}

// ---------------------------------------------------------------------------
// Methodology
// ---------------------------------------------------------------------------

export async function getMethodologyById(
  id: string,
  supabase: SupabaseClient,
): Promise<ScoreMethodology | null> {
  const { data, error } = await supabase
    .from("score_methodologies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new AppError("INTERNAL", `Failed to read methodology: ${error.message}`);
  }
  return data ? rowToMethodology(data as Record<string, unknown>) : null;
}

export async function getActiveMethodology(
  supabase: SupabaseClient,
): Promise<ScoreMethodology | null> {
  const { data, error } = await supabase
    .from("score_methodologies")
    .select("*")
    .eq("status", "active")
    .maybeSingle();
  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to read active methodology: ${error.message}`,
    );
  }
  return data ? rowToMethodology(data as Record<string, unknown>) : null;
}

export async function listMethodologies(
  supabase: SupabaseClient,
): Promise<ScoreMethodology[]> {
  const { data, error } = await supabase
    .from("score_methodologies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    throw new AppError("INTERNAL", `Failed to list methodologies: ${error.message}`);
  }
  return (data ?? []).map((row) => rowToMethodology(row as Record<string, unknown>));
}

export async function insertMethodology(
  fields: Omit<
    ScoreMethodology,
    "id" | "createdAt" | "updatedAt" | "publishedAt" | "deprecatedAt"
  > & { status?: ScoreMethodologyStatus },
  supabase: SupabaseClient,
): Promise<ScoreMethodology> {
  const { data, error } = await supabase
    .from("score_methodologies")
    .insert({
      version: fields.version,
      name: fields.name,
      description: fields.description,
      status: fields.status ?? "draft",
      category_definitions: fields.categoryDefinitions,
      weights: fields.weights,
      created_by_user_id: fields.createdByUserId,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError(
      "INTERNAL",
      `Failed to insert methodology: ${error?.message ?? "no data"}`,
    );
  }
  return rowToMethodology(data as Record<string, unknown>);
}

export async function updateMethodologyDraft(
  id: string,
  fields: Partial<
    Pick<ScoreMethodology, "name" | "description" | "categoryDefinitions" | "weights">
  >,
  supabase: SupabaseClient,
): Promise<ScoreMethodology> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.name !== undefined) updates.name = fields.name;
  if (fields.description !== undefined) updates.description = fields.description;
  if (fields.categoryDefinitions !== undefined) {
    updates.category_definitions = fields.categoryDefinitions;
  }
  if (fields.weights !== undefined) updates.weights = fields.weights;

  const { data, error } = await supabase
    .from("score_methodologies")
    .update(updates)
    .eq("id", id)
    .eq("status", "draft")
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Methodology update failed (must be in draft): ${error?.message ?? "no row"}`,
      undefined,
      422,
    );
  }
  return rowToMethodology(data as Record<string, unknown>);
}

export async function setMethodologyStatus(
  id: string,
  status: ScoreMethodologyStatus,
  supabase: SupabaseClient,
): Promise<ScoreMethodology> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "active") updates.published_at = new Date().toISOString();
  if (status === "deprecated") updates.deprecated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("score_methodologies")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError(
      "INTERNAL",
      `Failed to set methodology status: ${error?.message ?? "no data"}`,
    );
  }
  return rowToMethodology(data as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export async function insertSnapshot(
  fields: Omit<ProviderScoreSnapshot, "id" | "createdAt" | "computedAt"> & {
    computedAt?: string;
  },
  supabase: SupabaseClient,
): Promise<ProviderScoreSnapshot> {
  const { data, error } = await supabase
    .from("provider_score_snapshots")
    .insert({
      organization_id: fields.organizationId,
      methodology_id: fields.methodologyId,
      methodology_version: fields.methodologyVersion,
      category_scores: fields.categoryScores,
      weighted_composite: fields.weightedComposite,
      score_status: fields.scoreStatus,
      calc_metadata: fields.calcMetadata,
      computed_at: fields.computedAt ?? new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError(
      "INTERNAL",
      `Failed to insert score snapshot: ${error?.message ?? "no data"}`,
    );
  }
  return rowToSnapshot(data as Record<string, unknown>);
}

export async function getSnapshotById(
  id: string,
  supabase: SupabaseClient,
): Promise<ProviderScoreSnapshot | null> {
  const { data, error } = await supabase
    .from("provider_score_snapshots")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new AppError("INTERNAL", `Failed to read snapshot: ${error.message}`);
  }
  return data ? rowToSnapshot(data as Record<string, unknown>) : null;
}

export async function getLatestSnapshotForOrg(
  organizationId: string,
  supabase: SupabaseClient,
): Promise<ProviderScoreSnapshot | null> {
  const { data, error } = await supabase
    .from("provider_score_snapshots")
    .select("*")
    .eq("organization_id", organizationId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to read latest snapshot: ${error.message}`,
    );
  }
  return data ? rowToSnapshot(data as Record<string, unknown>) : null;
}

export async function listSnapshotsForOrg(
  organizationId: string,
  supabase: SupabaseClient,
): Promise<ProviderScoreSnapshot[]> {
  const { data, error } = await supabase
    .from("provider_score_snapshots")
    .select("*")
    .eq("organization_id", organizationId)
    .order("computed_at", { ascending: false });
  if (error) {
    throw new AppError("INTERNAL", `Failed to list snapshots: ${error.message}`);
  }
  return (data ?? []).map((row) => rowToSnapshot(row as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export async function insertScoreInputs(
  inputs: Omit<ProviderScoreInput, "id" | "createdAt">[],
  supabase: SupabaseClient,
): Promise<ProviderScoreInput[]> {
  if (inputs.length === 0) return [];
  const rows = inputs.map((i) => ({
    snapshot_id: i.snapshotId,
    organization_id: i.organizationId,
    category: i.category,
    signal_type: i.signalType,
    raw_value: i.rawValue,
    normalized_value: i.normalizedValue,
    weight: i.weight,
    contribution: i.contribution,
    source: i.source,
  }));
  const { data, error } = await supabase
    .from("provider_score_inputs")
    .insert(rows)
    .select("*");
  if (error || !data) {
    throw new AppError(
      "INTERNAL",
      `Failed to insert score inputs: ${error?.message ?? "no data"}`,
    );
  }
  return data.map((row) => rowToInput(row as Record<string, unknown>));
}

export async function getInputsForSnapshot(
  snapshotId: string,
  supabase: SupabaseClient,
): Promise<ProviderScoreInput[]> {
  const { data, error } = await supabase
    .from("provider_score_inputs")
    .select("*")
    .eq("snapshot_id", snapshotId);
  if (error) {
    throw new AppError("INTERNAL", `Failed to read snapshot inputs: ${error.message}`);
  }
  return (data ?? []).map((row) => rowToInput(row as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Reliability summaries
// ---------------------------------------------------------------------------

export async function insertReliabilitySummary(
  fields: Omit<
    ProviderReliabilitySummary,
    "id" | "createdAt" | "updatedAt" | "computedAt" | "freshness" | "isCurrent"
  > & { freshness?: string; isCurrent?: boolean },
  supabase: SupabaseClient,
): Promise<ProviderReliabilitySummary> {
  // First, demote any existing current summary for this org so the partial
  // unique index doesn't reject the insert.
  await supabase
    .from("provider_reliability_summaries")
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .eq("organization_id", fields.organizationId)
    .eq("is_current", true);

  const { data, error } = await supabase
    .from("provider_reliability_summaries")
    .insert({
      organization_id: fields.organizationId,
      snapshot_id: fields.snapshotId,
      reliability_tier: fields.reliabilityTier,
      highlights: fields.highlights,
      availability_summary: fields.availabilitySummary,
      language_summary: fields.languageSummary,
      freshness: fields.freshness ?? new Date().toISOString(),
      is_current: fields.isCurrent ?? true,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError(
      "INTERNAL",
      `Failed to insert reliability summary: ${error?.message ?? "no data"}`,
    );
  }
  return rowToSummary(data as Record<string, unknown>);
}

export async function getCurrentReliabilitySummary(
  organizationId: string,
  supabase: SupabaseClient,
): Promise<ProviderReliabilitySummary | null> {
  const { data, error } = await supabase
    .from("provider_reliability_summaries")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_current", true)
    .maybeSingle();
  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to read reliability summary: ${error.message}`,
    );
  }
  return data ? rowToSummary(data as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------

export async function insertDispute(
  fields: Omit<
    ScoreDispute,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "openedAt"
    | "reviewedByUserId"
    | "reviewedAt"
    | "resolutionNotes"
    | "resolutionOutcome"
  >,
  supabase: SupabaseClient,
): Promise<ScoreDispute> {
  const { data, error } = await supabase
    .from("score_disputes")
    .insert({
      organization_id: fields.organizationId,
      snapshot_id: fields.snapshotId,
      status: fields.status,
      reason: fields.reason,
      evidence: fields.evidence,
      opened_by_user_id: fields.openedByUserId,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError(
      "INTERNAL",
      `Failed to insert dispute: ${error?.message ?? "no data"}`,
    );
  }
  return rowToDispute(data as Record<string, unknown>);
}

export async function getDisputeById(
  id: string,
  supabase: SupabaseClient,
): Promise<ScoreDispute | null> {
  const { data, error } = await supabase
    .from("score_disputes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new AppError("INTERNAL", `Failed to read dispute: ${error.message}`);
  }
  return data ? rowToDispute(data as Record<string, unknown>) : null;
}

export async function updateDispute(
  id: string,
  fields: Partial<
    Pick<
      ScoreDispute,
      | "status"
      | "reviewedByUserId"
      | "reviewedAt"
      | "resolutionNotes"
      | "resolutionOutcome"
    >
  >,
  supabase: SupabaseClient,
): Promise<ScoreDispute> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.status !== undefined) updates.status = fields.status;
  if (fields.reviewedByUserId !== undefined) {
    updates.reviewed_by_user_id = fields.reviewedByUserId;
  }
  if (fields.reviewedAt !== undefined) updates.reviewed_at = fields.reviewedAt;
  if (fields.resolutionNotes !== undefined) {
    updates.resolution_notes = fields.resolutionNotes;
  }
  if (fields.resolutionOutcome !== undefined) {
    updates.resolution_outcome = fields.resolutionOutcome;
  }
  const { data, error } = await supabase
    .from("score_disputes")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError(
      "INTERNAL",
      `Failed to update dispute: ${error?.message ?? "no data"}`,
    );
  }
  return rowToDispute(data as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Affiliation
// ---------------------------------------------------------------------------

export async function insertAffiliation(
  fields: Omit<
    ProviderAffiliationStatus,
    "id" | "createdAt" | "updatedAt" | "setAt" | "isCurrent"
  > & { isCurrent?: boolean },
  supabase: SupabaseClient,
): Promise<ProviderAffiliationStatus> {
  // Demote prior current row first.
  await supabase
    .from("provider_affiliation_statuses")
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .eq("organization_id", fields.organizationId)
    .eq("is_current", true);

  const { data, error } = await supabase
    .from("provider_affiliation_statuses")
    .insert({
      organization_id: fields.organizationId,
      status: fields.status,
      reason: fields.reason,
      notes: fields.notes,
      set_by_user_id: fields.setByUserId,
      is_current: fields.isCurrent ?? true,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError(
      "INTERNAL",
      `Failed to insert affiliation: ${error?.message ?? "no data"}`,
    );
  }
  return rowToAffiliation(data as Record<string, unknown>);
}

export async function getCurrentAffiliation(
  organizationId: string,
  supabase: SupabaseClient,
): Promise<ProviderAffiliationStatus | null> {
  const { data, error } = await supabase
    .from("provider_affiliation_statuses")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_current", true)
    .maybeSingle();
  if (error) {
    throw new AppError("INTERNAL", `Failed to read affiliation: ${error.message}`);
  }
  return data ? rowToAffiliation(data as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// Search index projection
// ---------------------------------------------------------------------------

/**
 * Updates `provider_search_index.reliability_tier` for an organization.
 * This is the ONLY place 6.1 writes to the search index. Domain 0.6 owns
 * the rest of that table; this column is the trust projection.
 */
export async function updateSearchIndexReliabilityTier(
  organizationId: string,
  tier: ReliabilityTier,
  supabase: SupabaseClient,
): Promise<void> {
  const { error } = await supabase
    .from("provider_search_index")
    .update({
      reliability_tier: tier,
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", organizationId);
  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to update search index reliability tier: ${error.message}`,
    );
  }
}
