/**
 * Phase 0: Centralized case data access.
 * Phase 3: will add organization_id filtering.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";

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

  const { data: caseRow, error: caseError } = await supabaseAdmin
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .single();

  if (caseError || !caseRow) {
    throw new AppError("NOT_FOUND", "Case not found", undefined, 404);
  }

  const { data: docs, error: docsError } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (docsError) {
    throw new AppError("INTERNAL", "Failed to fetch documents", undefined, 500);
  }

  return {
    case: caseRow as CaseRow,
    documents: (docs ?? []) as DocumentRow[],
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

  let query = supabaseAdmin
    .from("case_access")
    .select(
      `
      role,
      can_view,
      can_edit,
      cases:cases ( * )
    `
    )
    .eq("user_id", ctx.userId)
    .eq("can_view", true);

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
