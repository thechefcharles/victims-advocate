/**
 * Shared org creation + org_admin membership (used by /api/org/register and pending-signup completion).
 */

import type { AuthContext } from "@/lib/server/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";
import { orgRowFromCatalogEntry } from "@/lib/server/org/catalogOrgFields";
import { syncOrganizationLifecycleFromOwnership } from "@/lib/server/organizations/state";

export const ORG_TYPES = ["nonprofit", "hospital", "gov", "other"] as const;

export type CreatedOrg = {
  id: string;
  created_at: string;
  name: string;
  type: string;
  status: string;
  catalog_entry_id?: number | null;
};

export type CreateOrgParams = {
  supabase: SupabaseClient;
  ctx: AuthContext;
  req: Request;
  /** If set, name/type/metadata come from the Illinois victim assistance directory. */
  catalogEntryId?: number | null;
  /** Used when catalogEntryId is not set. */
  name?: string;
  type?: string;
  /**
   * When true, caller becomes active org_owner immediately and lifecycle sync runs.
   * Platform admins use this; organization leaders get a pending org_claim_requests row instead.
   */
  assignOwnerImmediately?: boolean;
};

export type CreateOrgResult =
  | { organization: CreatedOrg; claimPending: boolean }
  | { error: AppError }
  | { existingOrganization: { id: string; name: string } };

export async function createOrganizationForUser(
  params: CreateOrgParams
): Promise<CreateOrgResult> {
  const { supabase, ctx, req, catalogEntryId } = params;
  const assignOwnerImmediately = params.assignOwnerImmediately === true;

  const { data: existing } = await supabase
    .from("org_memberships")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    return {
      error: new AppError(
        "VALIDATION_ERROR",
        "You already belong to an organization. Leave it before creating another.",
        undefined,
        400
      ),
    };
  }

  let name: string;
  let type: string;
  let metadata: Record<string, unknown> = {};
  let resolvedCatalogId: number | null = null;

  if (catalogEntryId != null && Number.isFinite(catalogEntryId)) {
    const fromCatalog = orgRowFromCatalogEntry(Number(catalogEntryId));
    if (!fromCatalog) {
      return {
        error: new AppError("VALIDATION_ERROR", "Invalid catalog_entry_id (not in directory)", undefined, 422),
      };
    }

    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("catalog_entry_id", fromCatalog.catalog_entry_id)
      .eq("status", "active")
      .maybeSingle();

    if (existingOrg) {
      return {
        existingOrganization: { id: existingOrg.id, name: existingOrg.name ?? fromCatalog.name },
      };
    }

    name = fromCatalog.name;
    type = fromCatalog.type;
    resolvedCatalogId = fromCatalog.catalog_entry_id;
    metadata = fromCatalog.metadata;
  } else {
    const n = typeof params.name === "string" ? params.name.trim() : "";
    const t = typeof params.type === "string" ? params.type.trim().toLowerCase() : "";
    if (!n) {
      return { error: new AppError("VALIDATION_ERROR", "name is required", undefined, 422) };
    }
    if (!ORG_TYPES.includes(t as (typeof ORG_TYPES)[number])) {
      return {
        error: new AppError(
          "VALIDATION_ERROR",
          `type must be one of: ${ORG_TYPES.join(", ")}`,
          undefined,
          422
        ),
      };
    }
    name = n;
    type = t;
  }

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({
      name,
      type,
      status: "active",
      created_by: ctx.userId,
      catalog_entry_id: resolvedCatalogId,
      metadata,
    } as Record<string, unknown>)
    .select("id, created_at, name, type, status, catalog_entry_id")
    .single();

  if (orgErr || !org) {
    return {
      error: new AppError("INTERNAL", orgErr?.message ?? "Failed to create organization", undefined, 500),
    };
  }

  if (!assignOwnerImmediately) {
    const { data: claimRow, error: claimErr } = await supabase
      .from("org_claim_requests")
      .insert({
        organization_id: org.id,
        user_id: ctx.userId,
        status: "pending",
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (claimErr || !claimRow) {
      await supabase.from("organizations").delete().eq("id", org.id);
      return {
        error: new AppError(
          "INTERNAL",
          claimErr?.message ?? "Failed to submit ownership request",
          undefined,
          500
        ),
      };
    }

    await logEvent({
      ctx,
      action: "org.create",
      resourceType: "organization",
      resourceId: org.id,
      organizationId: org.id,
      metadata: {
        name: org.name,
        type: org.type,
        catalog_entry_id: resolvedCatalogId,
        ownership_claim_id: claimRow.id,
        ownership_claim_pending: true,
      },
      req,
    });

    await logEvent({
      ctx,
      action: "org.claim_request.submitted",
      resourceType: "org_claim_request",
      resourceId: claimRow.id as string,
      organizationId: org.id,
      metadata: { catalog_entry_id: resolvedCatalogId },
      req,
    });

    logger.info("org.create.claim_pending", {
      userId: ctx.userId,
      orgId: org.id,
      claimId: claimRow.id,
      catalogEntryId: resolvedCatalogId,
    });

    return { organization: org as CreatedOrg, claimPending: true };
  }

  const { error: memErr } = await supabase.from("org_memberships").insert({
    user_id: ctx.userId,
    organization_id: org.id,
    org_role: "org_owner",
    status: "active",
    created_by: ctx.userId,
  });

  if (memErr) {
    await supabase.from("organizations").delete().eq("id", org.id);
    return { error: new AppError("INTERNAL", "Failed to create membership", undefined, 500) };
  }

  await syncOrganizationLifecycleFromOwnership(supabase, org.id);

  await logEvent({
    ctx,
    action: "org.create",
    resourceType: "organization",
    resourceId: org.id,
    organizationId: org.id,
    metadata: { name: org.name, type: org.type, catalog_entry_id: resolvedCatalogId },
    req,
  });

  logger.info("org.create", { userId: ctx.userId, orgId: org.id, catalogEntryId: resolvedCatalogId });

  return { organization: org as CreatedOrg, claimPending: false };
}
