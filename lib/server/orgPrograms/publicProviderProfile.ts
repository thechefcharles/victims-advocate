/**
 * Domain 3.6 — Public-safe provider profile assembly.
 *
 * Joins organizations + trust_signal_summary + active programs into a shape
 * suitable for unauthenticated discovery. Intentionally excludes:
 *   - overall_score (only tier label is public per Trust Law)
 *   - internal notes / staff names / financial / admin metadata
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { getProgramsForOrg, type Program } from "./orgProgramService";

export interface PublicProgramView {
  id: string;
  programName: string;
  programType: string;
  description: string | null;
  serviceTypes: string[];
  crimeTypesServed: string[];
  languages: string[];
  acceptingReferrals: boolean;
  capacityStatus: string;
  servesMinors: boolean;
  geographicCoverage: string[];
}

export interface PublicProviderProfile {
  organizationId: string;
  name: string;
  description: string | null;
  serviceTypes: string[];
  languages: string[];
  geographicCoverage: { states: string[]; counties: string[]; zips: string[] };
  acceptingClients: boolean;
  capacityStatus: string | null;
  qualityTier: string | null;
  programs: PublicProgramView[];
}

function toPublicProgram(p: Program): PublicProgramView {
  return {
    id: p.id,
    programName: p.program_name,
    programType: p.program_type,
    description: p.description,
    serviceTypes: p.service_types,
    crimeTypesServed: p.crime_types_served,
    languages: p.languages,
    acceptingReferrals: p.accepting_referrals,
    capacityStatus: p.capacity_status,
    servesMinors: p.serves_minors,
    geographicCoverage: p.geographic_coverage,
  };
}

export async function getPublicProviderProfile(
  orgId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<PublicProviderProfile> {
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select(
      "id, name, description, status, lifecycle_status, public_profile_status, service_types, languages, coverage_area, accepting_clients, capacity_status",
    )
    .eq("id", orgId)
    .maybeSingle();
  if (orgErr) throw new AppError("INTERNAL", orgErr.message, undefined, 500);
  if (!org) throw new AppError("NOT_FOUND", "Provider not found.", undefined, 404);

  const orgRow = org as {
    id: string;
    name: string;
    description: string | null;
    status: string;
    lifecycle_status: string | null;
    public_profile_status: string | null;
    service_types: string[] | null;
    languages: string[] | null;
    coverage_area: Record<string, unknown> | null;
    accepting_clients: boolean | null;
    capacity_status: string | null;
  };
  if (orgRow.status !== "active") {
    throw new AppError("NOT_FOUND", "Provider not found.", undefined, 404);
  }

  const { data: summary } = await supabase
    .from("trust_signal_summary")
    .select("quality_tier, public_display_active")
    .eq("organization_id", orgId)
    .maybeSingle();
  const summaryRow = summary as
    | { quality_tier: string | null; public_display_active: boolean | null }
    | null;
  const qualityTier =
    summaryRow?.public_display_active === true ? summaryRow.quality_tier : "data_pending";

  const programs = await getProgramsForOrg(orgId, { activeOnly: true }, supabase);
  const coverage = (orgRow.coverage_area ?? {}) as {
    states?: string[];
    counties?: string[];
    zips?: string[];
  };

  return {
    organizationId: orgRow.id,
    name: orgRow.name,
    description: orgRow.description,
    serviceTypes: orgRow.service_types ?? [],
    languages: orgRow.languages ?? [],
    geographicCoverage: {
      states: Array.isArray(coverage.states) ? coverage.states : [],
      counties: Array.isArray(coverage.counties) ? coverage.counties : [],
      zips: Array.isArray(coverage.zips) ? coverage.zips : [],
    },
    acceptingClients: orgRow.accepting_clients !== false,
    capacityStatus: orgRow.capacity_status,
    qualityTier,
    programs: programs.map(toPublicProgram),
  };
}
