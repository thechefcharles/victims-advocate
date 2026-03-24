/**
 * Phase 7: Internal case notes – role-restricted; victims cannot access.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { isOrgLeadership } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { getCaseById } from "./cases";

export type CaseNoteRow = {
  id: string;
  created_at: string;
  updated_at: string;
  case_id: string;
  organization_id: string;
  author_user_id: string;
  author_role: string | null;
  content: string;
  is_internal: boolean;
  status: string;
  edited_at: string | null;
  edited_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
};

/**
 * List internal notes for a case. Throws if caller is victim (owner).
 */
export async function listCaseNotes(params: {
  caseId: string;
  ctx: AuthContext;
}): Promise<CaseNoteRow[]> {
  const { caseId, ctx } = params;
  const result = await getCaseById({ caseId, ctx });
  if (!result) throw new AppError("NOT_FOUND", "Case not found", undefined, 404);
  if (result.access.role === "owner") throw new AppError("FORBIDDEN", "Internal notes are not visible to case owners", undefined, 403);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("case_notes")
    .select("*")
    .eq("case_id", caseId)
    .in("status", ["active", "edited"])
    .order("created_at", { ascending: false });

  if (error) throw new AppError("INTERNAL", "Failed to list notes", undefined, 500);
  return (data ?? []) as CaseNoteRow[];
}

/**
 * Create an internal note. Victims cannot create.
 */
export async function createCaseNote(params: {
  caseId: string;
  ctx: AuthContext;
  content: string;
}): Promise<CaseNoteRow> {
  const { caseId, ctx, content } = params;
  const result = await getCaseById({ caseId, ctx });
  if (!result) throw new AppError("NOT_FOUND", "Case not found", undefined, 404);
  if (result.access.role === "owner") throw new AppError("FORBIDDEN", "Case owners cannot add internal notes", undefined, 403);

  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!trimmed) throw new AppError("VALIDATION_ERROR", "Note content is required", undefined, 422);

  const caseRow = result.case as { organization_id: string };
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("case_notes")
    .insert({
      case_id: caseId,
      organization_id: caseRow.organization_id,
      author_user_id: ctx.userId,
      author_role: ctx.orgRole ?? ctx.role,
      content: trimmed,
      is_internal: true,
      status: "active",
    })
    .select("*")
    .single();

  if (error) throw new AppError("INTERNAL", "Failed to create note", undefined, 500);
  return data as CaseNoteRow;
}

/**
 * Edit a note. Author or supervisor/org_admin/admin can edit.
 */
export async function editCaseNote(params: {
  noteId: string;
  ctx: AuthContext;
  content: string;
}): Promise<CaseNoteRow> {
  const { noteId, ctx, content } = params;
  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!trimmed) throw new AppError("VALIDATION_ERROR", "Note content is required", undefined, 422);

  const supabase = getSupabaseAdmin();
  const { data: note, error: fetchErr } = await supabase
    .from("case_notes")
    .select("*")
    .eq("id", noteId)
    .in("status", ["active", "edited"])
    .maybeSingle();

  if (fetchErr || !note) throw new AppError("NOT_FOUND", "Note not found", undefined, 404);

  const result = await getCaseById({ caseId: note.case_id, ctx });
  if (!result) throw new AppError("NOT_FOUND", "Case not found", undefined, 404);
  if (result.access.role === "owner") throw new AppError("FORBIDDEN", "Access denied", undefined, 403);

  const canEdit =
    ctx.isAdmin || isOrgLeadership(ctx.orgRole) || note.author_user_id === ctx.userId;
  if (!canEdit) throw new AppError("FORBIDDEN", "You cannot edit this note", undefined, 403);

  const { data: updated, error } = await supabase
    .from("case_notes")
    .update({
      content: trimmed,
      status: "edited",
      edited_at: new Date().toISOString(),
      edited_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .select("*")
    .single();

  if (error) throw new AppError("INTERNAL", "Failed to update note", undefined, 500);
  return updated as CaseNoteRow;
}

/**
 * Soft-delete a note. Author or supervisor/org_admin/admin can delete.
 */
export async function deleteCaseNote(params: { noteId: string; ctx: AuthContext }): Promise<void> {
  const { noteId, ctx } = params;
  const supabase = getSupabaseAdmin();
  const { data: note, error: fetchErr } = await supabase
    .from("case_notes")
    .select("*")
    .eq("id", noteId)
    .in("status", ["active", "edited"])
    .maybeSingle();

  if (fetchErr || !note) throw new AppError("NOT_FOUND", "Note not found", undefined, 404);

  const result = await getCaseById({ caseId: note.case_id, ctx });
  if (!result) throw new AppError("NOT_FOUND", "Case not found", undefined, 404);
  if (result.access.role === "owner") throw new AppError("FORBIDDEN", "Access denied", undefined, 403);

  const canDelete =
    ctx.isAdmin || isOrgLeadership(ctx.orgRole) || note.author_user_id === ctx.userId;
  if (!canDelete) throw new AppError("FORBIDDEN", "You cannot delete this note", undefined, 403);

  const { error } = await supabase
    .from("case_notes")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
      deleted_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId);

  if (error) throw new AppError("INTERNAL", "Failed to delete note", undefined, 500);
}
