/**
 * @deprecated Phase 1 — not used by the live app access path. Table `org_role_permissions`
 * may still exist in DB; do not call these helpers from routes.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import type { OrgRole } from "./orgRoles";

export const PERMISSION_RESOURCES = [
  "cases",
  "documents",
  "team",
  "profile",
  "reports",
  "messages",
] as const;

export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

export type PermissionAction = "view" | "create" | "edit" | "delete" | "export";

export type PermissionScope = "all" | "team" | "own" | "none";

const TTL_MS = 120_000;

type MatrixRow = {
  role: string;
  resource: string;
  action: string;
  scope: string;
};

function matrixKey(role: OrgRole, resource: PermissionResource, action: PermissionAction): string {
  return `${role}\0${resource}\0${action}`;
}

let cache: { map: Map<string, PermissionScope>; expiresAt: number } | null = null;

async function loadMatrixMap(): Promise<Map<string, PermissionScope>> {
  const now = Date.now();
  if (cache && now < cache.expiresAt) {
    return cache.map;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("org_role_permissions")
    .select("role, resource, action, scope");

  if (error) {
    logger.error("org_matrix.load_failed", { message: error.message });
    throw new Error("org_role_permissions load failed");
  }

  const map = new Map<string, PermissionScope>();
  for (const row of (data ?? []) as MatrixRow[]) {
    const role = row.role as OrgRole;
    const resource = row.resource as PermissionResource;
    const action = row.action as PermissionAction;
    const scope = row.scope as PermissionScope;
    if (
      PERMISSION_RESOURCES.includes(resource as PermissionResource) &&
      ["view", "create", "edit", "delete", "export"].includes(action) &&
      ["all", "team", "own", "none"].includes(scope)
    ) {
      map.set(matrixKey(role, resource, action), scope);
    }
  }

  cache = { map, expiresAt: now + TTL_MS };
  return map;
}

/** Scope for this role/resource/action, or null if not allowed (no row). */
export async function getOrgPermissionScope(
  orgRole: OrgRole,
  resource: PermissionResource,
  action: PermissionAction
): Promise<PermissionScope | null> {
  const map = await loadMatrixMap();
  return map.get(matrixKey(orgRole, resource, action)) ?? null;
}

/** True when the matrix grants the action (row exists and scope is not none). */
export async function canPerform(
  orgRole: OrgRole | null,
  resource: PermissionResource,
  action: PermissionAction
): Promise<boolean> {
  if (!orgRole) return false;
  const scope = await getOrgPermissionScope(orgRole, resource, action);
  return scope !== null && scope !== "none";
}
