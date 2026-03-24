/**
 * ORG-2A: Org-scoped case access using org_role_permissions + assignment / supervisor tree.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type { AuthContext } from "./context";
import { logEvent } from "@/lib/server/audit/logEvent";
import {
  getOrgPermissionScope,
  type PermissionAction,
  type PermissionResource,
  type PermissionScope,
} from "./orgMatrix";

export type CaseRowLike = {
  id?: string;
  organization_id?: string | null;
  assigned_advocate_id?: string | null;
  owner_user_id?: unknown;
  status?: string | null;
};

export function scopeToOrg(ctx: AuthContext): string {
  if (!ctx.orgId) {
    throw new AppError("FORBIDDEN", "Organization context required", undefined, 403);
  }
  return ctx.orgId;
}

export async function fetchSuperviseeUserIds(
  supervisorUserId: string,
  organizationId: string
): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("org_memberships")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("supervised_by_user_id", supervisorUserId)
    .eq("status", "active");

  if (error) {
    return new Set();
  }
  const set = new Set<string>();
  for (const row of data ?? []) {
    const id = (row as { user_id?: string }).user_id;
    if (id) set.add(id);
  }
  return set;
}

function caseMatchesAssignmentScope(
  ctx: AuthContext,
  caseRow: CaseRowLike,
  scope: PermissionScope,
  superviseeIds: Set<string> | null
): boolean {
  const assigned = caseRow.assigned_advocate_id ?? null;

  if (scope === "all") {
    return true;
  }
  if (scope === "own") {
    return assigned != null && assigned === ctx.userId;
  }
  if (scope === "team") {
    if (assigned == null || assigned === "") {
      return true;
    }
    if (assigned === ctx.userId) {
      return true;
    }
    return superviseeIds?.has(assigned) ?? false;
  }
  return false;
}

export async function logOrgPermissionDenied(params: {
  ctx: AuthContext;
  req?: Request | null;
  resource: PermissionResource;
  action: PermissionAction;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { ctx, req, resource, action, metadata = {} } = params;
  await logEvent({
    ctx,
    action: "org.permission_denied",
    resourceType: resource,
    resourceId: null,
    severity: "security",
    metadata: { attempted_action: action, ...metadata },
    req: req ?? undefined,
  });
}

/**
 * Org member viewing/editing a case in their org (not victim owner, not relying on case_access alone).
 */
export async function evaluateOrgMemberCaseAccess(params: {
  ctx: AuthContext;
  caseRow: CaseRowLike;
  permissionAction: PermissionAction;
  req?: Request | null;
}): Promise<boolean> {
  const { ctx, caseRow, permissionAction, req } = params;
  const caseOrgId = caseRow.organization_id ?? null;
  const orgRole = ctx.orgRole;

  if (!ctx.orgId || !caseOrgId || ctx.orgId !== caseOrgId) {
    return false;
  }
  if (!orgRole) {
    await logOrgPermissionDenied({
      ctx,
      req,
      resource: "cases",
      action: permissionAction,
      metadata: { reason: "no_org_role", caseId: caseRow.id },
    });
    return false;
  }

  const scope = await getOrgPermissionScope(orgRole, "cases", permissionAction);
  if (scope === null || scope === "none") {
    await logOrgPermissionDenied({
      ctx,
      req,
      resource: "cases",
      action: permissionAction,
      metadata: { reason: "matrix_denied", orgRole, caseId: caseRow.id },
    });
    return false;
  }

  let superviseeIds: Set<string> | null = null;
  if (orgRole === "supervisor" && scope === "team") {
    superviseeIds = await fetchSuperviseeUserIds(ctx.userId, ctx.orgId);
  }

  const ok = caseMatchesAssignmentScope(ctx, caseRow, scope, superviseeIds);
  if (!ok) {
    await logOrgPermissionDenied({
      ctx,
      req,
      resource: "cases",
      action: permissionAction,
      metadata: {
        reason: "assignment_scope",
        matrix_scope: scope,
        orgRole,
        caseId: caseRow.id,
      },
    });
  }
  return ok;
}

/** Intake-stage cases: compensation workflow before submission. */
export function isIntakeStageCaseStatus(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "draft" || s === "ready_for_review";
}

export async function evaluateOrgMemberDocumentAccess(params: {
  ctx: AuthContext;
  caseRow: CaseRowLike;
  permissionAction: PermissionAction;
  req?: Request | null;
}): Promise<boolean> {
  const { ctx, caseRow, permissionAction, req } = params;

  if (ctx.orgRole === "auditor") {
    await logOrgPermissionDenied({
      ctx,
      req,
      resource: "documents",
      action: permissionAction,
      metadata: { reason: "auditor_blocked", caseId: caseRow.id },
    });
    return false;
  }

  const caseOrgId = caseRow.organization_id ?? null;
  const orgRole = ctx.orgRole;

  if (!ctx.orgId || !caseOrgId || ctx.orgId !== caseOrgId) {
    return false;
  }
  if (!orgRole) {
    await logOrgPermissionDenied({
      ctx,
      req,
      resource: "documents",
      action: permissionAction,
      metadata: { reason: "no_org_role", caseId: caseRow.id },
    });
    return false;
  }

  const scope = await getOrgPermissionScope(orgRole, "documents", permissionAction);
  if (scope === null || scope === "none") {
    await logOrgPermissionDenied({
      ctx,
      req,
      resource: "documents",
      action: permissionAction,
      metadata: { reason: "matrix_denied", orgRole, caseId: caseRow.id },
    });
    return false;
  }

  let superviseeIds: Set<string> | null = null;
  if (orgRole === "supervisor" && scope === "team") {
    superviseeIds = await fetchSuperviseeUserIds(ctx.userId, ctx.orgId);
  }

  const ok = caseMatchesAssignmentScope(ctx, caseRow, scope, superviseeIds);
  if (!ok) {
    await logOrgPermissionDenied({
      ctx,
      req,
      resource: "documents",
      action: permissionAction,
      metadata: {
        reason: "assignment_scope",
        matrix_scope: scope,
        orgRole,
        caseId: caseRow.id,
      },
    });
  }
  return ok;
}
