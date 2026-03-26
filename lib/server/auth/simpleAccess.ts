/**
 * Phase 1: Explicit case/document/message access (no permission matrix).
 * owner + supervisor → all cases in org; advocate → assigned cases only.
 */

import { AppError } from "@/lib/server/api";
import type { AuthContext } from "./context";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { SimpleOrgRole } from "@/lib/auth/simpleOrgRole";
import { sameUserId } from "@/lib/server/data/ids";

export function scopeToOrg(ctx: AuthContext): string {
  if (!ctx.orgId) {
    throw new AppError("FORBIDDEN", "Organization context required", undefined, 403);
  }
  return ctx.orgId;
}

export type CaseRowMinimal = {
  organization_id?: string | null;
  owner_user_id?: unknown;
  assigned_advocate_id?: string | null;
};

export function hasOrgScope(ctx: AuthContext, caseRow: CaseRowMinimal): boolean {
  const oid = caseRow.organization_id ?? null;
  return !!(ctx.orgId && oid && ctx.orgId === oid);
}

/** Victim owns case, or assigned advocate matches. */
export function isOwnCase(ctx: AuthContext, caseRow: CaseRowMinimal): boolean {
  if (sameUserId(caseRow.owner_user_id, ctx.userId)) return true;
  const aid = caseRow.assigned_advocate_id ?? null;
  return aid != null && aid === ctx.userId;
}

/**
 * Org member can see case: owner/supervisor see whole org; advocate only if assigned.
 */
export function orgMemberCanAccessCase(ctx: AuthContext, caseRow: CaseRowMinimal): boolean {
  if (!hasOrgScope(ctx, caseRow) || !ctx.orgRole) return false;
  const r = ctx.orgRole as SimpleOrgRole;
  if (r === "owner" || r === "supervisor") return true;
  if (r === "advocate") {
    const aid = caseRow.assigned_advocate_id ?? null;
    return aid != null && aid === ctx.userId;
  }
  return false;
}

export function orgMemberCanEditCase(ctx: AuthContext, caseRow: CaseRowMinimal): boolean {
  return orgMemberCanAccessCase(ctx, caseRow);
}

/**
 * Combined check: victim owner, platform admin, org rules (same-org staff), then case_access shares.
 * Same-org staff must pass org role rules even if a case_access row exists.
 */
export function assertOwnOrOrgCaseAccess(params: {
  ctx: AuthContext;
  caseRow: CaseRowMinimal;
  hasExplicitCaseAccess: boolean;
}): { allowed: boolean; reason?: string } {
  const { ctx, caseRow, hasExplicitCaseAccess } = params;
  if (ctx.isAdmin) return { allowed: true };
  if (sameUserId(caseRow.owner_user_id, ctx.userId)) return { allowed: true };

  const orgStaff =
    hasOrgScope(ctx, caseRow) &&
    (ctx.role === "advocate" || ctx.role === "organization") &&
    Boolean(ctx.orgRole);

  if (orgStaff) {
    if (orgMemberCanAccessCase(ctx, caseRow)) return { allowed: true };
    return { allowed: false, reason: "org_case_scope" };
  }

  if (hasExplicitCaseAccess) return { allowed: true };
  return { allowed: false, reason: "no_access" };
}

export type AccessDenialMeta = {
  resource: string;
  attemptedAction: string;
  targetId?: string | null;
};

/** Minimal audit for access denials (Phase 1). */
export async function logAccessDenied(
  ctx: AuthContext,
  req: Request | null | undefined,
  meta: AccessDenialMeta
): Promise<void> {
  await logEvent({
    ctx,
    action: "org.permission_denied",
    resourceType: meta.resource,
    resourceId: meta.targetId ?? null,
    severity: "security",
    metadata: {
      userId: ctx.userId,
      role: ctx.role,
      orgRole: ctx.orgRole ?? null,
      attempted_action: meta.attemptedAction,
      target_id: meta.targetId ?? null,
    },
    req: req ?? undefined,
  });
}
