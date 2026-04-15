/**
 * Domain 5.2 — Knowledge resource service.
 *
 * External-resource catalog: hotlines, legal aid, government programs,
 * shelters. Distinct from `knowledge_entries` (content articles).
 *
 * Search uses Postgres `websearch_to_tsquery` against the pre-built GIN
 * index on (title + description + eligibility_notes). Filters (type, geo,
 * language, crime_type) apply as AND clauses. Always filters is_active=true.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";

export type KnowledgeResourceType =
  | "emergency_aid"
  | "legal_aid"
  | "shelter"
  | "counseling"
  | "hotline"
  | "government_program"
  | "food_assistance"
  | "housing_assistance"
  | "transportation"
  | "childcare"
  | "employment"
  | "other";

export type KnowledgeGeographicScope =
  | "national"
  | "illinois"
  | "indiana"
  | "cook_county"
  | "chicago"
  | "other_local";

export interface KnowledgeResource {
  id: string;
  title: string;
  description: string;
  resourceType: KnowledgeResourceType;
  geographicScope: KnowledgeGeographicScope;
  contactPhone: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  address: string | null;
  languages: string[];
  availability: string | null;
  eligibilityNotes: string | null;
  crimeTypesServed: string[];
  isActive: boolean;
  isVerified: boolean;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToResource(r: Record<string, unknown>): KnowledgeResource {
  return {
    id: String(r.id),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    resourceType: r.resource_type as KnowledgeResourceType,
    geographicScope: r.geographic_scope as KnowledgeGeographicScope,
    contactPhone: (r.contact_phone as string | null) ?? null,
    contactEmail: (r.contact_email as string | null) ?? null,
    websiteUrl: (r.website_url as string | null) ?? null,
    address: (r.address as string | null) ?? null,
    languages: Array.isArray(r.languages) ? (r.languages as string[]) : [],
    availability: (r.availability as string | null) ?? null,
    eligibilityNotes: (r.eligibility_notes as string | null) ?? null,
    crimeTypesServed: Array.isArray(r.crime_types_served)
      ? (r.crime_types_served as string[])
      : [],
    isActive: Boolean(r.is_active),
    isVerified: Boolean(r.is_verified),
    lastVerifiedAt: (r.last_verified_at as string | null) ?? null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

// ---------------------------------------------------------------------------
// searchResources
// ---------------------------------------------------------------------------

export interface SearchQuery {
  text?: string | null;
  resourceType?: KnowledgeResourceType | null;
  geographicScope?: KnowledgeGeographicScope | null;
  language?: string | null;
  crimeType?: string | null;
  limit?: number;
  cursor?: string | null;
}

export async function searchResources(
  query: SearchQuery,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{ resources: KnowledgeResource[]; nextCursor: string | null }> {
  const limit = Math.min(50, Math.max(1, query.limit ?? 20));
  let q = supabase
    .from("knowledge_resources")
    .select("*")
    .eq("is_active", true)
    .order("is_verified", { ascending: false })
    .order("title", { ascending: true })
    .limit(limit + 1);

  if (query.text && query.text.trim().length > 0) {
    // Uses the FTS index created on (title + description + eligibility_notes).
    q = q.textSearch(
      "title",
      query.text.trim(),
      { type: "websearch", config: "english" },
    );
  }
  if (query.resourceType) q = q.eq("resource_type", query.resourceType);
  if (query.geographicScope) q = q.eq("geographic_scope", query.geographicScope);
  if (query.language) q = q.contains("languages", [query.language]);
  if (query.crimeType) q = q.contains("crime_types_served", [query.crimeType]);
  if (query.cursor) q = q.gt("title", query.cursor);

  const { data, error } = await q;
  if (error) {
    throw new AppError("INTERNAL", "Knowledge resource search failed.", undefined, 500);
  }
  const rows = (data ?? []).map((r) => rowToResource(r as Record<string, unknown>));
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    resources: page,
    nextCursor: hasMore ? (page[page.length - 1]?.title ?? null) : null,
  };
}

export async function getResourceById(
  id: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<KnowledgeResource> {
  const { data, error } = await supabase
    .from("knowledge_resources")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new AppError("INTERNAL", "Failed to load knowledge resource.", undefined, 500);
  }
  if (!data) {
    throw new AppError("NOT_FOUND", "Knowledge resource not found.", undefined, 404);
  }
  return rowToResource(data as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// getResourcesForAI — bounded context for the AI tool runtime
// ---------------------------------------------------------------------------

export interface AIResourceContext {
  crimeType?: string | null;
  stateCode?: string | null;
  needTypes?: KnowledgeResourceType[];
}

export async function getResourcesForAI(
  context: AIResourceContext,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<KnowledgeResource[]> {
  const scopes = scopesForState(context.stateCode ?? null);

  let q = supabase
    .from("knowledge_resources")
    .select("*")
    .eq("is_active", true)
    .in("geographic_scope", scopes)
    .order("is_verified", { ascending: false })
    .limit(5);

  if (context.crimeType) {
    q = q.contains("crime_types_served", [context.crimeType]);
  }
  if (context.needTypes && context.needTypes.length > 0) {
    q = q.in("resource_type", context.needTypes);
  }

  const { data, error } = await q;
  if (error) return [];
  return (data ?? []).map((r) => rowToResource(r as Record<string, unknown>));
}

function scopesForState(stateCode: string | null): KnowledgeGeographicScope[] {
  const code = (stateCode ?? "").toUpperCase();
  if (code === "IL") return ["national", "illinois", "cook_county", "chicago"];
  if (code === "IN") return ["national", "indiana"];
  return ["national"];
}

// ---------------------------------------------------------------------------
// Admin CRUD (called by adminService with audit)
// ---------------------------------------------------------------------------

export interface CreateResourceInput {
  title: string;
  description: string;
  resourceType: KnowledgeResourceType;
  geographicScope: KnowledgeGeographicScope;
  contactPhone?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  address?: string | null;
  languages?: string[];
  availability?: string | null;
  eligibilityNotes?: string | null;
  crimeTypesServed?: string[];
}

export async function insertResource(
  input: CreateResourceInput,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<KnowledgeResource> {
  const { data, error } = await supabase
    .from("knowledge_resources")
    .insert({
      title: input.title,
      description: input.description,
      resource_type: input.resourceType,
      geographic_scope: input.geographicScope,
      contact_phone: input.contactPhone ?? null,
      contact_email: input.contactEmail ?? null,
      website_url: input.websiteUrl ?? null,
      address: input.address ?? null,
      languages: input.languages ?? ["en"],
      availability: input.availability ?? null,
      eligibility_notes: input.eligibilityNotes ?? null,
      crime_types_served: input.crimeTypesServed ?? [],
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to create knowledge resource.", undefined, 500);
  }
  return rowToResource(data as Record<string, unknown>);
}

export async function updateResourceFields(
  id: string,
  changes: Partial<CreateResourceInput>,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<KnowledgeResource> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (changes.title !== undefined) patch.title = changes.title;
  if (changes.description !== undefined) patch.description = changes.description;
  if (changes.resourceType !== undefined) patch.resource_type = changes.resourceType;
  if (changes.geographicScope !== undefined) patch.geographic_scope = changes.geographicScope;
  if (changes.contactPhone !== undefined) patch.contact_phone = changes.contactPhone;
  if (changes.contactEmail !== undefined) patch.contact_email = changes.contactEmail;
  if (changes.websiteUrl !== undefined) patch.website_url = changes.websiteUrl;
  if (changes.address !== undefined) patch.address = changes.address;
  if (changes.languages !== undefined) patch.languages = changes.languages;
  if (changes.availability !== undefined) patch.availability = changes.availability;
  if (changes.eligibilityNotes !== undefined) patch.eligibility_notes = changes.eligibilityNotes;
  if (changes.crimeTypesServed !== undefined) patch.crime_types_served = changes.crimeTypesServed;

  const { data, error } = await supabase
    .from("knowledge_resources")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to update knowledge resource.", undefined, 500);
  }
  return rowToResource(data as Record<string, unknown>);
}

export async function markResourceVerified(
  id: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<KnowledgeResource> {
  const { data, error } = await supabase
    .from("knowledge_resources")
    .update({
      is_verified: true,
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to mark resource verified.", undefined, 500);
  }
  return rowToResource(data as Record<string, unknown>);
}

export async function deactivateResource(
  id: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<KnowledgeResource> {
  const { data, error } = await supabase
    .from("knowledge_resources")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to deactivate resource.", undefined, 500);
  }
  return rowToResource(data as Record<string, unknown>);
}
