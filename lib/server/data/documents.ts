/**
 * Phase 0: Centralized document data access.
 * Phase 3: will add organization_id filtering.
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

  // Ensure user has access to the case
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
