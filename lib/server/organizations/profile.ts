import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { computeOrganizationProfileStage } from "@/lib/organizations/profileStage";
import { parseOrgLifecycleStatus, parseOrgPublicProfileStatus } from "@/lib/server/organizations/state";
import { logEvent } from "@/lib/server/audit/logEvent";
import { filterSensitiveChangedKeys } from "@/lib/server/organizations/profileFieldSensitivity";
import {
  buildSensitiveProfileUpdateSnapshots,
  insertUnresolvedSensitiveProfileFlag,
} from "@/lib/server/organizations/profileSensitiveTracking";
import { rowToOrganizationProfile, parseOrgProfilePatch } from "./validation";
import type { OrganizationProfile, OrganizationProfileRow } from "./types";

export function organizationRowToProfileRow(row: Record<string, unknown>): OrganizationProfileRow {
  const profile = rowToOrganizationProfile(row);
  const lifecycle_status = parseOrgLifecycleStatus(row.lifecycle_status) ?? "seeded";
  const public_profile_status = parseOrgPublicProfileStatus(row.public_profile_status) ?? "draft";
  const activation_submitted_at =
    row.activation_submitted_at != null && String(row.activation_submitted_at).trim() !== ""
      ? String(row.activation_submitted_at)
      : null;

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
    lifecycle_status,
    public_profile_status,
    activation_submitted_at,
  };
}

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
  return organizationRowToProfileRow(row);
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
  req?: Request | null;
}): Promise<OrgProfileUpdateResult> {
  const { ctx, body, req = null } = params;
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

  const ORG_ROW_TYPES = ["nonprofit", "hospital", "gov", "other"] as const;
  const topLevel: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string") {
      throw new AppError("VALIDATION_ERROR", "name must be a string", undefined, 422);
    }
    const n = body.name.trim();
    if (!n) {
      throw new AppError("VALIDATION_ERROR", "name cannot be empty", undefined, 422);
    }
    topLevel.name = n;
  }
  if (body.type !== undefined) {
    if (typeof body.type !== "string") {
      throw new AppError("VALIDATION_ERROR", "type must be a string", undefined, 422);
    }
    const t = body.type.trim().toLowerCase();
    if (!ORG_ROW_TYPES.includes(t as (typeof ORG_ROW_TYPES)[number])) {
      throw new AppError(
        "VALIDATION_ERROR",
        `type must be one of: ${ORG_ROW_TYPES.join(", ")}`,
        undefined,
        422
      );
    }
    topLevel.type = t;
  }

  if (Object.keys(patch).length === 0 && Object.keys(topLevel).length === 0) {
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
  // `profile_stage` is derived only here and in migrations — see `lib/organizations/profileStage.ts`.
  const profile_stage = computeOrganizationProfileStage(merged);

  const updatePayload: Record<string, unknown> = {
    ...patch,
    ...topLevel,
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
  const updatedKeys = [...Object.keys(patch), ...Object.keys(topLevel)];

  const sensitiveChanged = filterSensitiveChangedKeys(updatedKeys);
  if (sensitiveChanged.length > 0) {
    const beforeRow = before as Record<string, unknown>;
    const snapshots = buildSensitiveProfileUpdateSnapshots(sensitiveChanged, beforeRow, row);
    void logEvent({
      ctx,
      action: "org.profile.sensitive_update",
      resourceType: "organization",
      resourceId: orgId,
      organizationId: orgId,
      metadata: {
        fields_changed: sensitiveChanged,
        snapshots,
        actor_is_admin: ctx.isAdmin === true,
      },
      req,
    }).catch(() => {});

    if (!ctx.isAdmin) {
      void insertUnresolvedSensitiveProfileFlag({
        supabase,
        organizationId: orgId,
        fieldsChanged: sensitiveChanged,
      });
    }
  }

  return {
    row: organizationRowToProfileRow(row),
    updatedKeys,
    prevProfileStatus: prevStatus,
    profileStatusChanged: prevStatus !== nextStatus,
  };
}
