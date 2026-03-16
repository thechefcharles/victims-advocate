/**
 * Phase 0: Centralized document data access.
 * Phase 3: Org-scoped; verifies case belongs to ctx.orgId (or admin) before listing.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";

export type DocumentRow = Record<string, unknown>;

export async function listCaseDocuments(params: {
  caseId: string;
  ctx: AuthContext;
}): Promise<DocumentRow[]> {
  const { caseId, ctx } = params;
  const supabaseAdmin = getSupabaseAdmin();

  const { data: caseRow, error: caseErr } = await supabaseAdmin
    .from("cases")
    .select("id, organization_id")
    .eq("id", caseId)
    .maybeSingle();

  if (caseErr) {
    throw new AppError("INTERNAL", "Case lookup failed", undefined, 500);
  }

  if (!caseRow) {
    throw new AppError("NOT_FOUND", "Case not found", undefined, 404);
  }

  const caseOrgId = caseRow.organization_id as string | null;
  const allowed =
    ctx.isAdmin || (ctx.orgId && caseOrgId && ctx.orgId === caseOrgId);

  if (!allowed) {
    throw new AppError("NOT_FOUND", "Case not found", undefined, 404);
  }

  const { data: accessRow, error: accessError } = await supabaseAdmin
    .from("case_access")
    .select("can_view")
    .eq("case_id", caseId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (accessError) {
    throw new AppError("INTERNAL", "Permission lookup failed", undefined, 500);
  }

  if (!accessRow?.can_view) {
    throw new AppError("FORBIDDEN", "Access denied", undefined, 403);
  }

  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError("INTERNAL", "Failed to list documents", undefined, 500);
  }

  return (data ?? []) as DocumentRow[];
}
