/**
 * Domain 3.3 — Public program search.
 *
 * Reads `program_definitions` (Phase 11 routing engine). Programs are not
 * currently FK-linked to organizations in the v1 schema — the result's
 * organizationId / organizationName fields are populated when the program
 * metadata carries an owning-org hint, otherwise null. This keeps the public
 * route contract stable while a future migration formalizes the ownership
 * link.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export interface ProgramSearchResultRow {
  programId: string;
  organizationId: string | null;
  organizationName: string | null;
  programName: string;
  programType: string;
  serviceTypes: string[];
  eligibilitySummary: string;
  languages: string[];
  acceptingReferrals: boolean;
  distanceKm: number | null;
}

export interface ProgramSearchResult {
  programs: ProgramSearchResultRow[];
  nextCursor: string | null;
  limit: number;
}

export interface SearchProgramsParams {
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number;
  programType?: string;
  crimeType?: string;
  language?: string;
  cursor?: string | null;
  limit: number;
}

function encodeCursor(programId: string): string {
  return Buffer.from(programId).toString("base64");
}

function decodeCursor(cursor: string | null | undefined): string | null {
  if (!cursor) return null;
  try {
    return Buffer.from(cursor, "base64").toString("utf8");
  } catch {
    return null;
  }
}

export async function searchPrograms(
  params: SearchProgramsParams,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ProgramSearchResult> {
  const limit = Math.min(50, Math.max(1, params.limit));
  let q = supabase
    .from("program_definitions")
    .select(
      "id, program_key, name, description, scope_type, state_code, status, is_active, metadata, rule_set",
    )
    .eq("is_active", true)
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(limit + 1);

  if (params.programType) q = q.eq("scope_type", params.programType);

  const cursorProgId = decodeCursor(params.cursor ?? null);
  if (cursorProgId) q = q.gt("id", cursorProgId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    program_key: string;
    name: string;
    description: string | null;
    scope_type: string;
    state_code: string | null;
    metadata: Record<string, unknown> | null;
    rule_set: Record<string, unknown> | null;
  };
  const rows = (data ?? []) as Row[];

  // Apply in-memory language + crime_type filters by reading hints from
  // metadata / rule_set. This lets us ship the route without a schema
  // migration — future work can promote these to typed columns + indexes.
  const filtered = rows.filter((r) => {
    const meta = r.metadata ?? {};
    const rule = r.rule_set ?? {};
    const languages = Array.isArray((meta as { languages?: string[] }).languages)
      ? ((meta as { languages: string[] }).languages as string[])
      : [];
    const serviceTypes = Array.isArray((meta as { serviceTypes?: string[] }).serviceTypes)
      ? ((meta as { serviceTypes: string[] }).serviceTypes as string[])
      : [];
    const crimeTypes = Array.isArray((rule as { crimeTypes?: string[] }).crimeTypes)
      ? ((rule as { crimeTypes: string[] }).crimeTypes as string[])
      : [];
    if (params.language && !languages.includes(params.language)) return false;
    if (params.crimeType && !crimeTypes.includes(params.crimeType)) return false;
    void serviceTypes;
    return true;
  });

  const hasMore = filtered.length > limit;
  const page = hasMore ? filtered.slice(0, limit) : filtered;

  const programs: ProgramSearchResultRow[] = page.map((r) => {
    const meta = r.metadata ?? {};
    const rule = r.rule_set ?? {};
    return {
      programId: r.id,
      organizationId:
        (meta as { organizationId?: string }).organizationId
          ? String((meta as { organizationId: string }).organizationId)
          : null,
      organizationName:
        (meta as { organizationName?: string }).organizationName
          ? String((meta as { organizationName: string }).organizationName)
          : null,
      programName: r.name,
      programType: r.scope_type,
      serviceTypes: Array.isArray((meta as { serviceTypes?: string[] }).serviceTypes)
        ? ((meta as { serviceTypes: string[] }).serviceTypes as string[])
        : [],
      eligibilitySummary:
        typeof (rule as { eligibilitySummary?: string }).eligibilitySummary === "string"
          ? ((rule as { eligibilitySummary: string }).eligibilitySummary as string)
          : r.description ?? "",
      languages: Array.isArray((meta as { languages?: string[] }).languages)
        ? ((meta as { languages: string[] }).languages as string[])
        : [],
      acceptingReferrals:
        (meta as { acceptingReferrals?: boolean }).acceptingReferrals !== false,
      distanceKm: null, // programs aren't yet tied to geo — future: join index
    };
  });

  return {
    programs,
    nextCursor: hasMore ? encodeCursor(page[page.length - 1]!.id) : null,
    limit,
  };
}
