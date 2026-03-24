import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { computeOrganizationProfileStage } from "@/lib/organizations/profileStage";
import { rowToOrganizationProfile, parseOrgProfilePatch } from "./validation";
import type { OrganizationProfile, OrganizationProfileRow } from "./types";

export async function getOrganizationProfileForContext(params: {
  ctx: AuthContext;
  organizationId?: string | null;
}): Promise<OrganizationProfileRow> {
  const { ctx } = params;
  let orgId = params.organizationId ?? ctx.orgId;
  if (!orgId && !ctx.isAdmin) {
    throw new AppError("FORBIDDEN", "Organization context required", undefined, 403);
  }
  if (ctx.isAdmin && params.organizationId) {
    orgId = params.organizationId;
  }
  if (!orgId) {
    throw new AppError("NOT_FOUND", "Organization not found", undefined, 404);
  }

  if (!ctx.isAdmin) {
    if (ctx.orgId !== orgId) {
      throw new AppError("FORBIDDEN", "Cannot access another organization's profile", undefined, 403);
    }
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle();
  if (error) {
    throw new AppError("INTERNAL", "Failed to load organization", undefined, 500);
  }
  if (!data) {
    throw new AppError("NOT_FOUND", "Organization not found", undefined, 404);
  }

  const row = data as Record<string, unknown>;
  const profile = rowToOrganizationProfile(row);
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    type: String(row.type ?? ""),
    status: String(row.status ?? ""),
    metadata: (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<
      string,
      unknown
    >,
    ...profile,
  };
}

export type OrgProfileUpdateResult = {
  row: OrganizationProfileRow;
  updatedKeys: string[];
  prevProfileStatus: string;
  profileStatusChanged: boolean;
};

export async function updateOrganizationProfile(params: {
  ctx: AuthContext;
  body: Record<string, unknown>;
  organizationId?: string | null;
}): Promise<OrgProfileUpdateResult> {
  const { ctx, body } = params;
  let orgId = params.organizationId ?? ctx.orgId;
  if (ctx.isAdmin && params.organizationId) {
    orgId = params.organizationId;
  }
  if (!orgId) {
    throw new AppError("FORBIDDEN", "Organization context required", undefined, 403);
  }
  if (!ctx.isAdmin && ctx.orgId !== orgId) {
    throw new AppError("FORBIDDEN", "Cannot update another organization's profile", undefined, 403);
  }

  const patch = parseOrgProfilePatch(body);
  if (Object.keys(patch).length === 0) {
    throw new AppError("VALIDATION_ERROR", "No valid profile fields to update", undefined, 422);
  }

  const supabase = getSupabaseAdmin();
  const { data: before } = await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle();
  if (!before) {
    throw new AppError("NOT_FOUND", "Organization not found", undefined, 404);
  }

  const prevStatus = String((before as Record<string, unknown>).profile_status ?? "draft");

  const beforeProfile = rowToOrganizationProfile(before as Record<string, unknown>);
  const merged: OrganizationProfile = { ...beforeProfile, ...patch };
  const profile_stage = computeOrganizationProfileStage(merged);

  const updatePayload: Record<string, unknown> = {
    ...patch,
    profile_stage,
    profile_last_updated_at: new Date().toISOString(),
    last_profile_update: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("organizations")
    .update(updatePayload)
    .eq("id", orgId)
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to update organization profile", undefined, 500);
  }

  const row = data as Record<string, unknown>;
  const profile = rowToOrganizationProfile(row);
  const nextStatus = profile.profile_status;
  const updatedKeys = Object.keys(patch);
  return {
    row: {
      id: String(row.id),
      name: String(row.name ?? ""),
      type: String(row.type ?? ""),
      status: String(row.status ?? ""),
      metadata: (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<
        string,
        unknown
      >,
      ...profile,
    },
    updatedKeys,
    prevProfileStatus: prevStatus,
    profileStatusChanged: prevStatus !== nextStatus,
  };
}
