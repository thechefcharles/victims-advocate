/**
 * Phase 0/3: Centralized document data access.
 * Phase 6: Status lifecycle (active/deleted/restricted), canAccessDocument, signed-URL flow support.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext, OrgRole } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";

export type DocumentRow = {
  id: string;
  case_id: string | null;
  organization_id: string;
  uploaded_by_user_id: string;
  doc_type: string;
  description: string | null;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string;
  status: "active" | "deleted" | "restricted";
  deleted_at?: string | null;
  deleted_by?: string | null;
  restricted_at?: string | null;
  restricted_by?: string | null;
  restriction_reason?: string | null;
  created_at?: string;
  [key: string]: unknown;
};

export type CaseAccessInfo = { role: string; can_view: boolean; can_edit: boolean };

/**
 * Phase 6: Survivor-safe restricted document access.
 * - deleted: no access.
 * - active: allowed (caller already has case access).
 * - restricted: victim only if they uploaded it; org_admin/supervisor/admin always; advocate if uploader or can_edit.
 */
export function canAccessDocument(
  ctx: AuthContext,
  document: DocumentRow,
  caseAccess: CaseAccessInfo
): boolean {
  if (document.status === "deleted") return false;
  if (document.status === "active") return true;

  if (document.status === "restricted") {
    if (ctx.isAdmin) return true;
    const orgRole = ctx.orgRole as OrgRole | null;
    if (orgRole === "org_admin" || orgRole === "supervisor") return true;
    if (document.uploaded_by_user_id === ctx.userId) return true;
    if (caseAccess.role === "owner") return true;
    if (caseAccess.can_edit) return true;
    return false;
  }

  return false;
}

/**
 * Phase 6: Get document by id. Returns null if not found or no org/case access (no existence leak).
 */
export async function getDocumentById(params: {
  documentId: string;
  ctx: AuthContext;
}): Promise<DocumentRow | null> {
  const { documentId, ctx } = params;
  const supabase = getSupabaseAdmin();

  const { data: doc, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (error) throw new AppError("INTERNAL", "Document lookup failed", undefined, 500);
  if (!doc) return null;

  const row = doc as unknown as DocumentRow;
  const caseOrgId = row.organization_id;
  const allowed = ctx.isAdmin || (ctx.orgId && caseOrgId && ctx.orgId === caseOrgId);
  if (!allowed) return null;

  return row;
}

/**
 * Phase 6: List documents for a case. Enforces org + case_access. Default status = 'active'; use includeRestricted for org_admin/supervisor/admin.
 */
export async function listCaseDocuments(params: {
  caseId: string;
  ctx: AuthContext;
  includeRestricted?: boolean;
}): Promise<DocumentRow[]> {
  const { caseId, ctx, includeRestricted = false } = params;
  const supabase = getSupabaseAdmin();

  const { data: caseRow, error: caseErr } = await supabase
    .from("cases")
    .select("id, organization_id")
    .eq("id", caseId)
    .maybeSingle();

  if (caseErr) throw new AppError("INTERNAL", "Case lookup failed", undefined, 500);
  if (!caseRow) throw new AppError("NOT_FOUND", "Case not found", undefined, 404);

  const caseOrgId = caseRow.organization_id as string | null;
  const allowed =
    ctx.isAdmin || (ctx.orgId && caseOrgId && ctx.orgId === caseOrgId);
  if (!allowed) throw new AppError("NOT_FOUND", "Case not found", undefined, 404);

  const { data: accessRow, error: accessError } = await supabase
    .from("case_access")
    .select("can_view, can_edit, role")
    .eq("case_id", caseId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (accessError) throw new AppError("INTERNAL", "Permission lookup failed", undefined, 500);

  const orgLeadershipDocs =
    ctx.orgId &&
    caseOrgId &&
    ctx.orgId === caseOrgId &&
    (ctx.orgRole === "org_admin" || ctx.orgRole === "supervisor");

  let access: CaseAccessInfo;
  if (accessRow?.can_view) {
    access = {
      role: accessRow.role ?? "viewer",
      can_view: true,
      can_edit: accessRow.can_edit ?? false,
    };
  } else if (ctx.isAdmin) {
    access = { role: "admin", can_view: true, can_edit: true };
  } else if (orgLeadershipDocs) {
    access = { role: "org_leadership", can_view: true, can_edit: true };
  } else {
    throw new AppError("FORBIDDEN", "Access denied", undefined, 403);
  }

  let query = supabase
    .from("documents")
    .select("*")
    .eq("case_id", caseId)
    .in("status", includeRestricted ? ["active", "restricted"] : ["active"])
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL", "Failed to list documents", undefined, 500);

  const rows = (data ?? []) as DocumentRow[];
  return rows.filter((d) => canAccessDocument(ctx, d, access));
}

/**
 * Phase 6: Assert caller can access document for view/download. Throws on denial.
 */
export async function assertDocumentAccess(params: {
  documentId: string;
  ctx: AuthContext;
  accessType: "view" | "download";
}): Promise<DocumentRow> {
  const { documentId, ctx, accessType } = params;
  const doc = await getDocumentById({ documentId, ctx });
  if (!doc) throw new AppError("NOT_FOUND", "Document not found", undefined, 404);
  if (doc.status === "deleted") throw new AppError("DOCUMENT_DELETED", "This document has been deleted", undefined, 404);

  const caseId = doc.case_id;
  if (!caseId) throw new AppError("FORBIDDEN", "Document not attached to a case", undefined, 403);

  const { data: caseRow } = await getSupabaseAdmin()
    .from("cases")
    .select("organization_id")
    .eq("id", caseId)
    .maybeSingle();
  const caseOrgId = (caseRow as { organization_id?: string } | null)?.organization_id ?? null;

  const { data: accessRow } = await getSupabaseAdmin()
    .from("case_access")
    .select("role, can_view, can_edit")
    .eq("case_id", caseId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  const orgLeadershipAssert =
    ctx.orgId &&
    caseOrgId &&
    ctx.orgId === caseOrgId &&
    (ctx.orgRole === "org_admin" || ctx.orgRole === "supervisor");

  let access: CaseAccessInfo;
  if (accessRow?.can_view) {
    access = {
      role: accessRow.role ?? "viewer",
      can_view: accessRow.can_view,
      can_edit: accessRow.can_edit ?? false,
    };
  } else if (ctx.isAdmin) {
    access = { role: "admin", can_view: true, can_edit: true };
  } else if (orgLeadershipAssert) {
    access = { role: "org_leadership", can_view: true, can_edit: true };
  } else {
    throw new AppError("DOCUMENT_ACCESS_DENIED", "Access denied", undefined, 403);
  }
  if (!canAccessDocument(ctx, doc, access)) {
    if (doc.status === "restricted") throw new AppError("DOCUMENT_RESTRICTED", "This document is restricted", undefined, 403);
    throw new AppError("DOCUMENT_ACCESS_DENIED", "Access denied", undefined, 403);
  }
  return doc;
}

/**
 * Phase 6: Soft delete document. Permissions: uploader, advocate with can_edit, or admin.
 */
export async function softDeleteDocument(params: {
  documentId: string;
  ctx: AuthContext;
}): Promise<DocumentRow> {
  const { documentId, ctx } = params;
  const doc = await getDocumentById({ documentId, ctx });
  if (!doc) throw new AppError("NOT_FOUND", "Document not found", undefined, 404);
  if (doc.status === "deleted") return doc;

  const caseId = doc.case_id;
  let canDelete = ctx.isAdmin || doc.uploaded_by_user_id === ctx.userId;
  if (!canDelete && caseId) {
    const { data: acc } = await getSupabaseAdmin()
      .from("case_access")
      .select("can_edit")
      .eq("case_id", caseId)
      .eq("user_id", ctx.userId)
      .maybeSingle();
    canDelete = acc?.can_edit === true;
  }
  if (!canDelete) throw new AppError("FORBIDDEN", "You cannot delete this document", undefined, 403);

  const supabase = getSupabaseAdmin();
  const { data: updated, error } = await supabase
    .from("documents")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
      deleted_by: ctx.userId,
    })
    .eq("id", documentId)
    .select("*")
    .single();

  if (error) throw new AppError("INTERNAL", "Failed to delete document", undefined, 500);
  return updated as unknown as DocumentRow;
}

/**
 * Phase 6: Set document restriction. Preferred: org_admin/supervisor/admin; v1 allow advocate with can_edit + admin.
 */
export async function setDocumentRestriction(params: {
  documentId: string;
  restricted: boolean;
  reason?: string | null;
  ctx: AuthContext;
}): Promise<DocumentRow> {
  const { documentId, restricted, reason, ctx } = params;
  const doc = await getDocumentById({ documentId, ctx });
  if (!doc) throw new AppError("NOT_FOUND", "Document not found", undefined, 404);
  if (doc.status === "deleted") throw new AppError("DOCUMENT_DELETED", "Document is deleted", undefined, 404);

  let canRestrict = ctx.isAdmin || ctx.orgRole === "org_admin" || ctx.orgRole === "supervisor";
  if (!canRestrict && doc.case_id) {
    const { data: acc } = await getSupabaseAdmin()
      .from("case_access")
      .select("can_edit")
      .eq("case_id", doc.case_id)
      .eq("user_id", ctx.userId)
      .maybeSingle();
    canRestrict = acc?.can_edit === true;
  }
  if (!canRestrict) throw new AppError("FORBIDDEN", "You cannot restrict this document", undefined, 403);

  const supabase = getSupabaseAdmin();
  const { data: updated, error } = await supabase
    .from("documents")
    .update({
      status: restricted ? "restricted" : "active",
      restricted_at: restricted ? new Date().toISOString() : null,
      restricted_by: restricted ? ctx.userId : null,
      restriction_reason: restricted ? (reason ?? null) : null,
    })
    .eq("id", documentId)
    .select("*")
    .single();

  if (error) throw new AppError("INTERNAL", "Failed to update document", undefined, 500);
  return updated as unknown as DocumentRow;
}
