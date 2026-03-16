/**
 * Phase 0: Centralized case data access.
 * Phase 3: Org-scoped; returns NOT_FOUND for cross-org access (no existence leak).
 * Phase 6: Documents via listCaseDocuments (status + restricted visibility).
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { listCaseDocuments } from "./documents";

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
  const allowed =
    ctx.isAdmin || (ctx.orgId && caseOrgId && ctx.orgId === caseOrgId);

  if (!allowed) {
    return null;
  }

  const { data: accessRow, error: accessError } = await supabaseAdmin
    .from("case_access")
    .select("role, can_view, can_edit")
    .eq("case_id", caseId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (accessError) {
    throw new AppError("INTERNAL", "Permission lookup failed", undefined, 500);
  }

  if (!accessRow || !accessRow.can_view) {
    return null;
  }

  const includeRestricted =
    ctx.isAdmin ||
    ctx.orgRole === "org_admin" ||
    ctx.orgRole === "supervisor";
  const documents = await listCaseDocuments({
    caseId,
    ctx,
    includeRestricted,
  });

  return {
    case: caseRow as CaseRow,
    documents: documents as DocumentRow[],
    access: accessRow as CaseAccess,
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

  if (!ctx.isAdmin && !ctx.orgId) {
    return [];
  }

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
