/**
 * Phase 0: Centralized case data access.
 * Phase 3: Org-scoped; returns NOT_FOUND for cross-org access (no existence leak).
 * Phase 6: Documents via listCaseDocuments (status + restricted visibility).
 * Phase 1: Simple org roles — owner/supervisor see org; advocate sees assigned cases only.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { isOrgLeadership } from "@/lib/server/auth";
import {
  assertOwnOrOrgCaseAccess,
  logAccessDenied,
  orgMemberCanEditCase,
  type CaseRowMinimal,
} from "@/lib/server/auth/simpleAccess";
import type { SimpleOrgRole } from "@/lib/auth/simpleOrgRole";
import { AppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { listCaseDocuments } from "./documents";
import { isUuidString, normalizeCaseIdParam, sameUserId } from "./ids";

export type CaseAccess = {
  role: string;
  can_view: boolean;
  can_edit: boolean;
};

export type CaseRow = Record<string, unknown>;
export type DocumentRow = Record<string, unknown>;

export type GetCaseByIdResult = {
  case: CaseRow;
  documents: DocumentRow[];
  access: CaseAccess;
};

function isOrgStaff(ctx: AuthContext, orgMatches: boolean): boolean {
  return (
    orgMatches &&
    (ctx.role === "advocate" || ctx.role === "organization") &&
    Boolean(ctx.orgRole)
  );
}

/** Scope case_access list to the user's org for org *staff* only — victims may have membership but own cases under other org ids. */
function scopeCaseListToActiveOrg(ctx: AuthContext): boolean {
  return (
    !ctx.isAdmin &&
    Boolean(ctx.orgId) &&
    (ctx.role === "advocate" || ctx.role === "organization")
  );
}

export async function getCaseById(params: {
  caseId: string;
  ctx: AuthContext;
  req?: Request | null;
}): Promise<GetCaseByIdResult | null> {
  const { caseId: rawId, ctx, req } = params;
  const caseId = normalizeCaseIdParam(rawId);
  if (!isUuidString(caseId)) {
    return null;
  }
  const supabaseAdmin = getSupabaseAdmin();

  const { data: caseRow, error: caseError } = await supabaseAdmin
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();

  if (caseError) {
    const msg = (caseError.message ?? "").toLowerCase();
    const invalidUuid =
      msg.includes("invalid input syntax for type uuid") ||
      msg.includes("invalid uuid");
    logger.error("cases.lookup_failed", {
      caseId,
      message: String(caseError.message ?? ""),
      code: String((caseError as { code?: string }).code ?? ""),
    });
    if (invalidUuid) {
      return null;
    }
    throw new AppError("INTERNAL", "Case lookup failed", undefined, 500);
  }

  if (!caseRow) {
    return null;
  }

  const caseOrgId = caseRow.organization_id as string | null;

  const { data: accessRow, error: accessError } = await supabaseAdmin
    .from("case_access")
    .select("role, can_view, can_edit")
    .eq("case_id", caseId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (accessError) {
    throw new AppError("INTERNAL", "Permission lookup failed", undefined, 500);
  }

  const isOwner = sameUserId(caseRow.owner_user_id, ctx.userId);
  const orgMatches = !!(ctx.orgId && caseOrgId && ctx.orgId === caseOrgId);
  const hasExplicitCaseAccess = accessRow?.can_view === true;
  const orgStaff = isOrgStaff(ctx, orgMatches);
  const minimal = caseRow as CaseRowMinimal;

  const { allowed, reason } = assertOwnOrOrgCaseAccess({
    ctx,
    caseRow: minimal,
    hasExplicitCaseAccess,
  });

  if (!allowed) {
    if (reason === "org_case_scope" && orgStaff && req) {
      await logAccessDenied(ctx, req, {
        resource: "case",
        attemptedAction: "view",
        targetId: caseId,
      });
    }
    return null;
  }

  let access: CaseAccess;
  if (ctx.isAdmin) {
    access = { role: "admin", can_view: true, can_edit: true };
  } else if (isOwner) {
    access = { role: "owner", can_view: true, can_edit: true };
  } else if (orgStaff && orgMatches) {
    const canEdit = orgMemberCanEditCase(ctx, minimal);
    access = {
      role: (ctx.orgRole as SimpleOrgRole) ?? "org",
      can_view: true,
      can_edit: canEdit,
    };
  } else if (accessRow?.can_view) {
    const base = accessRow as CaseAccess;
    // Owner ACL row must allow edits (schema default can_edit=false; some legacy rows never flipped).
    access =
      base.role === "owner"
        ? { role: "owner", can_view: true, can_edit: true }
        : base;
  } else {
    return null;
  }

  const includeRestricted = ctx.isAdmin || isOrgLeadership(ctx.orgRole);
  const documents = await listCaseDocuments({
    caseId,
    ctx,
    includeRestricted,
    req,
    preloadedCaseRow: minimal,
  });

  return {
    case: caseRow as CaseRow,
    documents: documents as DocumentRow[],
    access,
  };
}

/** Resolve case row after access checks (for routes that only need the case). */
export async function scopeToCase(
  ctx: AuthContext,
  caseId: string,
  req?: Request | null
): Promise<CaseRow | null> {
  const result = await getCaseById({ caseId, ctx, req });
  return result?.case ?? null;
}

export type CaseListItem = CaseRow & {
  access: { role: string; can_view: boolean; can_edit: boolean };
};

export async function listCasesForUser(params: {
  ctx: AuthContext;
  filters?: { clientId?: string; role?: string };
  req?: Request | null;
}): Promise<CaseListItem[]> {
  const { ctx, filters, req } = params;
  const supabaseAdmin = getSupabaseAdmin();

  let query = supabaseAdmin
    .from("case_access")
    .select(
      `
      role,
      can_view,
      can_edit,
      organization_id,
      cases:cases ( * )
    `
    )
    .eq("user_id", ctx.userId)
    .eq("can_view", true);

  if (scopeCaseListToActiveOrg(ctx)) {
    query = query.eq("organization_id", ctx.orgId);
  }

  if (filters?.role) {
    query = query.eq("role", filters.role);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
    foreignTable: "cases",
  });

  if (error) {
    throw new AppError("INTERNAL", "Failed to list cases", undefined, 500);
  }

  let rows = (data ?? []).filter((r: { cases?: unknown }) => r?.cases);

  if (scopeCaseListToActiveOrg(ctx)) {
    rows = rows.filter(
      (r) => (r as { cases?: { organization_id?: string } }).cases?.organization_id === ctx.orgId
    );
  }

  if (filters?.clientId) {
    const clientId = filters.clientId.trim();
    rows = rows.filter(
      (r) => (r as { cases?: { owner_user_id?: unknown } }).cases?.owner_user_id === clientId
    );
  }

  const out: CaseListItem[] = [];
  for (const row of rows) {
    const c = (row as unknown as { cases: CaseRow }).cases;
    const orgMatches = !!(ctx.orgId && c?.organization_id && ctx.orgId === (c.organization_id as string));
    const orgStaff = isOrgStaff(ctx, orgMatches);

    if (orgStaff && orgMatches) {
      const { allowed } = assertOwnOrOrgCaseAccess({
        ctx,
        caseRow: c as CaseRowMinimal,
        hasExplicitCaseAccess: true,
      });
      if (!allowed) continue;
    }

    const r = row as unknown as { role: string; can_view: boolean; can_edit: boolean };
    out.push({
      ...c,
      access: {
        role: r.role,
        can_view: r.can_view,
        can_edit: r.can_edit,
      },
    });
  }

  return out;
}

export async function listCasesForOrganization(params: {
  organizationId: string;
}): Promise<CaseRow[]> {
  const { organizationId } = params;
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("cases")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError("INTERNAL", "Failed to list org cases", undefined, 500);
  return (data ?? []) as CaseRow[];
}

export async function listCasesAssignedInOrg(params: {
  organizationId: string;
  userId: string;
}): Promise<CaseRow[]> {
  const { organizationId, userId } = params;
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("cases")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("assigned_advocate_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError("INTERNAL", "Failed to list assigned cases", undefined, 500);
  return (data ?? []) as CaseRow[];
}

/**
 * Org-scoped case lists: owner/supervisor → full org; advocate → assigned only.
 */
export async function listCasesForOrgRoleContext(params: {
  ctx: AuthContext;
}): Promise<CaseListItem[]> {
  const { ctx } = params;
  if (ctx.isAdmin && ctx.orgId) {
    const rows = await listCasesForOrganization({ organizationId: ctx.orgId });
    return rows.map((c) => ({
      ...c,
      access: { role: "advocate", can_view: true, can_edit: true },
    })) as CaseListItem[];
  }
  if (ctx.isAdmin || !ctx.orgId || !ctx.orgRole) {
    return listCasesForUser({ ctx, filters: { role: "advocate" } });
  }

  const r = ctx.orgRole as SimpleOrgRole;
  if (r === "owner" || r === "supervisor") {
    const rows = await listCasesForOrganization({ organizationId: ctx.orgId });
    return rows.map((c) => ({
      ...c,
      access: { role: "advocate", can_view: true, can_edit: true },
    })) as CaseListItem[];
  }

  const rows = await listCasesAssignedInOrg({
    organizationId: ctx.orgId,
    userId: ctx.userId,
  });
  return rows.map((c) => ({
    ...c,
    access: { role: "advocate", can_view: true, can_edit: true },
  })) as CaseListItem[];
}
