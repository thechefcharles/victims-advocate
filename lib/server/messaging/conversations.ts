import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { getCaseById } from "@/lib/server/data";
import type { CaseConversationRow } from "./types";

export async function getOrCreateConversationForCase(params: {
  caseId: string;
  ctx: AuthContext;
}): Promise<CaseConversationRow> {
  const { caseId, ctx } = params;
  const caseResult = await getCaseById({ caseId, ctx });
  if (!caseResult) throw new AppError("NOT_FOUND", "Case not found", undefined, 404);

  const orgId = caseResult.case.organization_id as string;
  const supabase = getSupabaseAdmin();

  const { data: existing, error: selErr } = await supabase
    .from("case_conversations")
    .select("*")
    .eq("case_id", caseId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (selErr) {
    throw new AppError("INTERNAL", "Failed to load conversation", undefined, 500);
  }
  if (existing) return existing as CaseConversationRow;

  const { data: inserted, error: insErr } = await supabase
    .from("case_conversations")
    .insert({
      case_id: caseId,
      organization_id: orgId,
      created_by: ctx.userId,
      status: "active",
    })
    .select("*")
    .single();

  if (insErr || !inserted) {
    throw new AppError("INTERNAL", "Failed to create conversation", undefined, 500);
  }
  return inserted as CaseConversationRow;
}

