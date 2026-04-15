/**
 * Domain 3.6 — Per-org Programs service.
 *
 * Distinct from `lib/server/programs/programService.ts` (Domain 3.3 platform
 * routing catalog). This service owns the *organization's own service
 * offerings*: program_name, capacity, eligibility, etc.
 *
 * Mutations refresh the per-org rollups on `provider_search_index` so search
 * results stay consistent without a cron. Capacity changes emit the
 * `program.capacity_updated` trust signal.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { emitSignal } from "@/lib/server/trustSignal";
import { isOrgManagement } from "@/lib/server/auth/orgRoles";
import type { AuthContext } from "@/lib/server/auth";

export type ProgramType =
  | "direct_services"
  | "legal_advocacy"
  | "counseling"
  | "emergency_shelter"
  | "transitional_housing"
  | "financial_assistance"
  | "court_advocacy"
  | "hospital_advocacy"
  | "crisis_hotline"
  | "other";

export type CapacityStatus = "open" | "limited" | "waitlist" | "paused";

export interface Program {
  id: string;
  organization_id: string;
  program_name: string;
  program_type: ProgramType;
  description: string | null;
  service_types: string[];
  crime_types_served: string[];
  eligibility_criteria: string | null;
  languages: string[];
  accepting_referrals: boolean;
  capacity_status: CapacityStatus;
  min_age: number | null;
  max_age: number | null;
  serves_minors: boolean;
  geographic_coverage: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProgramInput {
  programName: string;
  programType: ProgramType;
  description?: string | null;
  serviceTypes?: string[];
  crimeTypesServed?: string[];
  eligibilityCriteria?: string | null;
  languages?: string[];
  acceptingReferrals?: boolean;
  capacityStatus?: CapacityStatus;
  minAge?: number | null;
  maxAge?: number | null;
  servesMinors?: boolean;
  geographicCoverage?: string[];
}

export interface UpdateProgramInput {
  programName?: string;
  programType?: ProgramType;
  description?: string | null;
  serviceTypes?: string[];
  crimeTypesServed?: string[];
  eligibilityCriteria?: string | null;
  languages?: string[];
  minAge?: number | null;
  maxAge?: number | null;
  servesMinors?: boolean;
  geographicCoverage?: string[];
  isActive?: boolean;
}

function ensureOrgManager(ctx: AuthContext, orgId: string): void {
  if (ctx.isAdmin) return;
  if (ctx.orgId !== orgId || !isOrgManagement(ctx.orgRole ?? null)) {
    throw new AppError(
      "FORBIDDEN",
      "Org owner / program_manager required.",
      undefined,
      403,
    );
  }
}

async function refreshIndex(orgId: string, supabase: SupabaseClient): Promise<void> {
  await supabase.rpc("refresh_provider_search_index_programs", { target_org: orgId });
}

export async function getProgramsForOrg(
  orgId: string,
  options: { activeOnly?: boolean } = {},
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<Program[]> {
  let q = supabase
    .from("programs")
    .select("*")
    .eq("organization_id", orgId)
    .order("program_name", { ascending: true });
  if (options.activeOnly !== false) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw new AppError("INTERNAL", error.message, undefined, 500);
  return (data ?? []) as Program[];
}

export async function getProgramById(
  programId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<Program | null> {
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("id", programId)
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", error.message, undefined, 500);
  return (data as Program) ?? null;
}

export async function createProgram(
  ctx: AuthContext,
  orgId: string,
  input: CreateProgramInput,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<Program> {
  ensureOrgManager(ctx, orgId);
  if (!input.programName?.trim()) {
    throw new AppError("VALIDATION_ERROR", "programName required.", undefined, 422);
  }
  if (!input.programType) {
    throw new AppError("VALIDATION_ERROR", "programType required.", undefined, 422);
  }

  const row = {
    organization_id: orgId,
    program_name: input.programName.trim(),
    program_type: input.programType,
    description: input.description ?? null,
    service_types: input.serviceTypes ?? [],
    crime_types_served: input.crimeTypesServed ?? [],
    eligibility_criteria: input.eligibilityCriteria ?? null,
    languages: input.languages?.length ? input.languages : ["en"],
    accepting_referrals: input.acceptingReferrals ?? true,
    capacity_status: input.capacityStatus ?? "open",
    min_age: input.minAge ?? null,
    max_age: input.maxAge ?? null,
    serves_minors: input.servesMinors ?? false,
    geographic_coverage: input.geographicCoverage ?? [],
    is_active: true,
    created_by: ctx.userId,
  };
  const { data, error } = await supabase
    .from("programs")
    .insert(row)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", error?.message ?? "Insert failed.", undefined, 500);
  }
  const created = data as Program;

  await refreshIndex(orgId, supabase);
  await logEvent({
    ctx,
    action: "org.update",
    resourceType: "program",
    resourceId: created.id,
    organizationId: orgId,
    metadata: { verb: "program_created", program_type: created.program_type },
  });
  return created;
}

export async function updateProgram(
  ctx: AuthContext,
  programId: string,
  changes: UpdateProgramInput,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<Program> {
  const existing = await getProgramById(programId, supabase);
  if (!existing) throw new AppError("NOT_FOUND", "Program not found.", undefined, 404);
  ensureOrgManager(ctx, existing.organization_id);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (changes.programName !== undefined) patch.program_name = changes.programName.trim();
  if (changes.programType !== undefined) patch.program_type = changes.programType;
  if (changes.description !== undefined) patch.description = changes.description;
  if (changes.serviceTypes !== undefined) patch.service_types = changes.serviceTypes;
  if (changes.crimeTypesServed !== undefined) patch.crime_types_served = changes.crimeTypesServed;
  if (changes.eligibilityCriteria !== undefined)
    patch.eligibility_criteria = changes.eligibilityCriteria;
  if (changes.languages !== undefined) patch.languages = changes.languages;
  if (changes.minAge !== undefined) patch.min_age = changes.minAge;
  if (changes.maxAge !== undefined) patch.max_age = changes.maxAge;
  if (changes.servesMinors !== undefined) patch.serves_minors = changes.servesMinors;
  if (changes.geographicCoverage !== undefined)
    patch.geographic_coverage = changes.geographicCoverage;
  if (changes.isActive !== undefined) patch.is_active = changes.isActive;

  const { data, error } = await supabase
    .from("programs")
    .update(patch)
    .eq("id", programId)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", error?.message ?? "Update failed.", undefined, 500);
  }
  const updated = data as Program;
  await refreshIndex(updated.organization_id, supabase);
  await logEvent({
    ctx,
    action: "org.update",
    resourceType: "program",
    resourceId: updated.id,
    organizationId: updated.organization_id,
    metadata: { verb: "program_updated" },
  });
  return updated;
}

export interface UpdateStatusInput {
  acceptingReferrals?: boolean;
  capacityStatus?: CapacityStatus;
}

export async function updateProgramStatus(
  ctx: AuthContext,
  programId: string,
  input: UpdateStatusInput,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<Program> {
  if (input.acceptingReferrals === undefined && input.capacityStatus === undefined) {
    throw new AppError(
      "VALIDATION_ERROR",
      "acceptingReferrals or capacityStatus required.",
      undefined,
      422,
    );
  }
  const existing = await getProgramById(programId, supabase);
  if (!existing) throw new AppError("NOT_FOUND", "Program not found.", undefined, 404);
  ensureOrgManager(ctx, existing.organization_id);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.acceptingReferrals !== undefined) patch.accepting_referrals = input.acceptingReferrals;
  if (input.capacityStatus !== undefined) patch.capacity_status = input.capacityStatus;

  const { data, error } = await supabase
    .from("programs")
    .update(patch)
    .eq("id", programId)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", error?.message ?? "Update failed.", undefined, 500);
  }
  const updated = data as Program;

  if (
    input.capacityStatus !== undefined &&
    input.capacityStatus !== existing.capacity_status
  ) {
    await emitSignal(
      {
        orgId: updated.organization_id,
        signalType: "program.capacity_updated",
        value: 1,
        actorUserId: ctx.userId,
        actorAccountType: ctx.accountType ?? "provider",
        idempotencyKey: `${updated.organization_id}:program.capacity_updated:${updated.id}:${Date.now()}`,
        metadata: {
          program_id: updated.id,
          previous_status: existing.capacity_status,
          new_status: input.capacityStatus,
        },
      },
      supabase,
    );
  }

  await refreshIndex(updated.organization_id, supabase);
  await logEvent({
    ctx,
    action: "org.update",
    resourceType: "program",
    resourceId: updated.id,
    organizationId: updated.organization_id,
    metadata: {
      verb: "program_status_changed",
      capacity_from: existing.capacity_status,
      capacity_to: updated.capacity_status,
      accepting_from: existing.accepting_referrals,
      accepting_to: updated.accepting_referrals,
    },
  });
  return updated;
}
