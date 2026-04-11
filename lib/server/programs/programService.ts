/**
 * Domain 3.3 — Program service.
 * Owns all program definition mutations and queries.
 * Policy-agnostic — routes must enforce authorization before calling.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { getCatalogProgramById } from "@/lib/catalog/loadCatalog";
import { orgRowFromCatalogEntry } from "@/lib/server/organizations/catalogOrgFields";
import type { ProgramDefinitionRow } from "@/lib/server/routing/types";
import type { AuthContext } from "@/lib/server/auth";
import { updateProviderSearchIndexFromProgram } from "@/lib/server/search/programSearchSync";
import {
  ProgramNotFoundError,
  ProgramStateError,
  CatalogEntryNotFoundError,
  CatalogEntryDuplicateError,
} from "./errors";

const SCOPE_TYPES = ["state", "federal", "local", "general"] as const;
type ScopeType = (typeof SCOPE_TYPES)[number];

export interface CreateProgramPayload {
  program_key: string;
  name: string;
  description?: string | null;
  state_code?: string | null;
  scope_type?: ScopeType;
  version?: string;
  rule_set?: Record<string, unknown>;
  required_documents?: unknown[];
  deadline_metadata?: Record<string, unknown>;
  dependency_rules?: Record<string, unknown>;
  stacking_rules?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateProgramPayload {
  name?: string;
  description?: string | null;
  state_code?: string | null;
  program_key?: string;
  scope_type?: ScopeType;
  version?: string;
  rule_set?: Record<string, unknown>;
  required_documents?: unknown[];
  deadline_metadata?: Record<string, unknown>;
  dependency_rules?: Record<string, unknown>;
  stacking_rules?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ProgramListFilters {
  status?: "draft" | "active" | "archived";
  state_code?: string;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// listProgramDefinitions
// ---------------------------------------------------------------------------

export async function listProgramDefinitions(
  filters: ProgramListFilters = {}
): Promise<ProgramDefinitionRow[]> {
  const supabase = getSupabaseAdmin();
  let q = supabase.from("program_definitions").select("*").order("program_key");

  if (filters.status != null) q = q.eq("status", filters.status);
  if (filters.state_code != null && filters.state_code !== "") q = q.eq("state_code", filters.state_code);
  if (filters.is_active != null) q = q.eq("is_active", filters.is_active);

  const { data, error } = await q.limit(200);
  if (error) throw new AppError("INTERNAL", "Failed to list program definitions.", undefined, 500);
  return (data ?? []) as ProgramDefinitionRow[];
}

// ---------------------------------------------------------------------------
// createProgramDefinition
// ---------------------------------------------------------------------------

export async function createProgramDefinition(
  payload: CreateProgramPayload,
  ctx: AuthContext
): Promise<ProgramDefinitionRow> {
  const supabase = getSupabaseAdmin();
  const { data: inserted, error } = await supabase
    .from("program_definitions")
    .insert({
      program_key: payload.program_key.trim(),
      name: payload.name.trim(),
      description: payload.description?.trim() ?? null,
      state_code: payload.state_code?.trim() ?? null,
      scope_type: payload.scope_type ?? "state",
      status: "draft",
      is_active: false,
      version: payload.version?.trim() ?? "1",
      rule_set: payload.rule_set ?? {},
      required_documents: payload.required_documents ?? [],
      deadline_metadata: payload.deadline_metadata ?? {},
      dependency_rules: payload.dependency_rules ?? {},
      stacking_rules: payload.stacking_rules ?? {},
      metadata: payload.metadata ?? {},
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("*")
    .single();

  if (error) throw new AppError("INTERNAL", error.message, undefined, 500);
  const row = inserted as ProgramDefinitionRow;

  void logEvent({
    ctx,
    action: "routing.program_definition_create",
    resourceType: "program_definition",
    resourceId: row.id,
    metadata: { program_key: row.program_key },
  }).catch(() => {});

  void updateProviderSearchIndexFromProgram(row.id, "upsert").catch(() => {});

  return row;
}

// ---------------------------------------------------------------------------
// updateProgramDefinition
// ---------------------------------------------------------------------------

export async function updateProgramDefinition(
  id: string,
  payload: UpdateProgramPayload,
  ctx: AuthContext
): Promise<ProgramDefinitionRow> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchErr } = await supabase
    .from("program_definitions")
    .select("id, status, program_key")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) throw new ProgramNotFoundError(id);

  const row = existing as { status: string; program_key: string };
  if (row.status !== "draft") {
    throw new ProgramStateError(
      "Only draft programs can be updated. Archive and create a new version to change active content."
    );
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: ctx.userId,
  };

  if (typeof payload.name === "string") updates.name = payload.name.trim();
  if (payload.description !== undefined) updates.description = payload.description?.trim() ?? null;
  if (payload.state_code !== undefined) updates.state_code = payload.state_code ?? null;
  if (payload.program_key !== undefined) updates.program_key = payload.program_key.trim();
  if (payload.scope_type != null) updates.scope_type = payload.scope_type;
  if (payload.version != null) updates.version = payload.version.trim();
  if (payload.rule_set != null) updates.rule_set = payload.rule_set;
  if (payload.required_documents != null) updates.required_documents = payload.required_documents;
  if (payload.deadline_metadata != null) updates.deadline_metadata = payload.deadline_metadata;
  if (payload.dependency_rules != null) updates.dependency_rules = payload.dependency_rules;
  if (payload.stacking_rules != null) updates.stacking_rules = payload.stacking_rules;
  if (payload.metadata != null) updates.metadata = payload.metadata;

  const { data: updated, error } = await supabase
    .from("program_definitions")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new AppError("INTERNAL", error.message, undefined, 500);
  const updatedRow = updated as ProgramDefinitionRow;

  void logEvent({
    ctx,
    action: "routing.program_definition_update",
    resourceType: "program_definition",
    resourceId: id,
    metadata: { program_key: row.program_key },
  }).catch(() => {});

  void updateProviderSearchIndexFromProgram(id, "upsert").catch(() => {});

  return updatedRow;
}

// ---------------------------------------------------------------------------
// activateProgramDefinition
// ---------------------------------------------------------------------------

export async function activateProgramDefinition(
  id: string,
  ctx: AuthContext
): Promise<ProgramDefinitionRow> {
  const supabase = getSupabaseAdmin();

  const { data: program, error: fetchErr } = await supabase
    .from("program_definitions")
    .select("id, program_key, status")
    .eq("id", id)
    .single();

  if (fetchErr || !program) throw new ProgramNotFoundError(id);

  const row = program as { program_key: string; status: string };
  if (row.status !== "draft") {
    throw new ProgramStateError("Only draft programs can be activated.");
  }

  // Deactivate any currently active version for this program_key
  const { error: deactivateErr } = await supabase
    .from("program_definitions")
    .update({
      is_active: false,
      status: "archived",
      updated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    })
    .eq("program_key", row.program_key)
    .eq("is_active", true);

  if (deactivateErr) throw new AppError("INTERNAL", deactivateErr.message, undefined, 500);

  const { data: activated, error: activateErr } = await supabase
    .from("program_definitions")
    .update({
      is_active: true,
      status: "active",
      updated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (activateErr) throw new AppError("INTERNAL", activateErr.message, undefined, 500);
  const activatedRow = activated as ProgramDefinitionRow;

  void logEvent({
    ctx,
    action: "routing.program_definition_activate",
    resourceType: "program_definition",
    resourceId: id,
    metadata: { program_key: row.program_key },
  }).catch(() => {});

  void updateProviderSearchIndexFromProgram(id, "upsert").catch(() => {});

  return activatedRow;
}

// ---------------------------------------------------------------------------
// archiveProgramDefinition
// ---------------------------------------------------------------------------

export async function archiveProgramDefinition(
  id: string,
  ctx: AuthContext
): Promise<ProgramDefinitionRow> {
  const supabase = getSupabaseAdmin();

  const { data: updated, error } = await supabase
    .from("program_definitions")
    .update({
      is_active: false,
      status: "archived",
      updated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new AppError("INTERNAL", error.message, undefined, 500);
  if (!updated) throw new ProgramNotFoundError(id);

  const archivedRow = updated as ProgramDefinitionRow;

  void logEvent({
    ctx,
    action: "routing.program_definition_archive",
    resourceType: "program_definition",
    resourceId: id,
    metadata: { program_key: archivedRow.program_key },
  }).catch(() => {});

  void updateProviderSearchIndexFromProgram(id, "remove").catch(() => {});

  return archivedRow;
}

// ---------------------------------------------------------------------------
// linkOrgCatalogEntry
// ---------------------------------------------------------------------------

export async function linkOrgCatalogEntry(
  orgId: string,
  catalogEntryId: number | null,
  ctx: AuthContext
): Promise<void> {
  if (catalogEntryId != null && !getCatalogProgramById(catalogEntryId)) {
    throw new CatalogEntryNotFoundError(catalogEntryId);
  }

  const supabase = getSupabaseAdmin();
  const { data: orgRow, error: orgFetchErr } = await supabase
    .from("organizations")
    .select("id, metadata")
    .eq("id", orgId)
    .maybeSingle();

  if (orgFetchErr || !orgRow) {
    throw new AppError("INTERNAL", "Could not load organization.", undefined, 500);
  }

  const existingMeta =
    orgRow.metadata && typeof orgRow.metadata === "object" && !Array.isArray(orgRow.metadata)
      ? { ...(orgRow.metadata as Record<string, unknown>) }
      : {};

  let patch: Record<string, unknown>;

  if (catalogEntryId != null) {
    // Check for duplicate — another org already linked to this catalog entry
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id")
      .eq("catalog_entry_id", catalogEntryId)
      .neq("id", orgId)
      .maybeSingle();

    if (existingOrg) throw new CatalogEntryDuplicateError(catalogEntryId);

    const row = orgRowFromCatalogEntry(catalogEntryId);
    if (!row) throw new CatalogEntryNotFoundError(catalogEntryId);

    patch = {
      name: row.name,
      type: row.type,
      catalog_entry_id: row.catalog_entry_id,
      metadata: row.metadata,
    };
  } else {
    delete existingMeta.catalog_program;
    patch = { catalog_entry_id: null, metadata: existingMeta };
  }

  const { error: updErr } = await supabase.from("organizations").update(patch).eq("id", orgId);
  if (updErr) throw new AppError("INTERNAL", "Could not update organization.", undefined, 500);

  void logEvent({
    ctx,
    action: "program.catalog_entry_linked",
    resourceType: "organization",
    resourceId: orgId,
    metadata: { catalog_entry_id: catalogEntryId },
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// setUserProgramAffiliation
// ---------------------------------------------------------------------------

export async function setUserProgramAffiliation(
  userId: string,
  catalogEntryId: number | null,
  ctx: AuthContext
): Promise<void> {
  if (catalogEntryId != null && !getCatalogProgramById(catalogEntryId)) {
    throw new CatalogEntryNotFoundError(catalogEntryId);
  }

  const supabase = getSupabaseAdmin();
  const payload = {
    affiliated_catalog_entry_id: catalogEntryId,
    updated_at: new Date().toISOString(),
  };

  const { data: updatedRows, error: updateErr } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select("id");

  if (updateErr) {
    const msg = updateErr.message ?? "";
    if (msg.includes("affiliated_catalog_entry_id")) {
      throw new AppError(
        "INTERNAL",
        "Database is missing the affiliation column. Run migration 20260323000000_profiles_program_catalog.sql.",
        { code: updateErr.code },
        500
      );
    }
    throw new AppError("INTERNAL", `Could not update profile: ${msg}`, undefined, 500);
  }

  const touched = updatedRows && updatedRows.length > 0;
  if (!touched) {
    const role = (ctx as { realRole?: string; role?: string }).realRole ?? ctx.role ?? "advocate";
    const { error: upsertErr } = await supabase.from("profiles").upsert(
      { id: userId, role, ...payload },
      { onConflict: "id" }
    );
    if (upsertErr) {
      throw new AppError("INTERNAL", `Could not update profile: ${upsertErr.message}`, undefined, 500);
    }
  }

  void logEvent({
    ctx,
    action: "profile.affiliation_updated",
    resourceType: "profile",
    resourceId: userId,
    metadata: { catalog_entry_id: catalogEntryId },
  }).catch(() => {});
}
