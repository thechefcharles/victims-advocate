/**
 * Phase 0: Centralized case data access.
 * Phase 3: Org-scoped; returns NOT_FOUND for cross-org access (no existence leak).
 * Phase 6: Documents via listCaseDocuments (status + restricted visibility).
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { isOrgLeadership } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { listCaseDocuments } from "./documents";
import { sameUserId } from "./ids";

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

export async function getCaseById(
  params: { caseId: string; ctx: AuthContext }
): Promise<GetCaseByIdResult | null> {
  const { caseId, ctx } = params;
  const supabaseAdmin = getSupabaseAdmin();

  const { data: caseRow, error: caseError } = await supabaseAdmin
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();

  if (caseError) {
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

  // Allow: platform admin; case owner; same org (staff); or any user with a case_access grant
  // (invited collaborators may have no org membership — do not gate on org before case_access).
  const allowed =
    ctx.isAdmin ||
    isOwner ||
    orgMatches ||
    hasExplicitCaseAccess;

  if (!allowed) {
    return null;
  }

  const orgLeadershipAccess =
    !ctx.isAdmin &&
    ctx.orgId &&
    caseOrgId &&
    ctx.orgId === caseOrgId &&
    isOrgLeadership(ctx.orgRole);

  let access: CaseAccess;
  if (accessRow?.can_view) {
    access = accessRow as CaseAccess;
  } else if (ctx.isAdmin) {
    access = { role: "admin", can_view: true, can_edit: true };
  } else if (orgLeadershipAccess) {
    // Org admin / supervisor can open org cases without a personal case_access row
    access = { role: "org_leadership", can_view: true, can_edit: true };
  } else if (isOwner) {
    // Owner row may exist without case_access if insert failed during case create
    access = { role: "owner", can_view: true, can_edit: true };
  } else {
    return null;
  }

  const includeRestricted = ctx.isAdmin || isOrgLeadership(ctx.orgRole);
  const documents = await listCaseDocuments({
    caseId,
    ctx,
    includeRestricted,
  });

  return {
    case: caseRow as CaseRow,
    documents: documents as DocumentRow[],
    access,
  };
}

export type CaseListItem = CaseRow & {
  access: { role: string; can_view: boolean; can_edit: boolean };
};

export async function listCasesForUser(params: {
  ctx: AuthContext;
  filters?: { clientId?: string; role?: string };
}): Promise<CaseListItem[]> {
  const { ctx, filters } = params;
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

  if (!ctx.isAdmin && ctx.orgId) {
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

  let rows = (data ?? []).filter((r: any) => r?.cases);

  if (!ctx.isAdmin && ctx.orgId) {
    rows = rows.filter((r: any) => r.cases?.organization_id === ctx.orgId);
  }

  if (filters?.clientId) {
    const clientId = filters.clientId.trim();
    rows = rows.filter((r: any) => r.cases?.owner_user_id === clientId);
  }

  return rows.map((row: any) => {
    const c = row.cases;
    return {
      ...c,
      access: {
        role: row.role,
        can_view: row.can_view,
        can_edit: row.can_edit,
      },
    };
  }) as CaseListItem[];
}

/**
 * Phase 14: List all cases for an organization. Use only when caller is org_admin, supervisor, or admin.
 */
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
