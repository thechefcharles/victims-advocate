/**
 * Phase 0/3: Centralized document data access.
 * Phase 6: Restricted visibility.
 * Phase 1: Same case-scope rules as cases (owner/supervisor/advocate).
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { isOrgLeadership } from "@/lib/server/auth";
import {
  assertOwnOrOrgCaseAccess,
  orgMemberCanEditCase,
  type CaseRowMinimal,
} from "@/lib/server/auth/simpleAccess";
import type { SimpleOrgRole } from "@/lib/auth/simpleOrgRole";
import { AppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { normalizeCaseIdParam, sameUserId } from "./ids";

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

function isOrgStaff(ctx: AuthContext, orgMatches: boolean): boolean {
  return (
    orgMatches &&
    (ctx.role === "advocate" || ctx.role === "organization") &&
    Boolean(ctx.orgRole)
  );
}

export function canAccessDocument(
  ctx: AuthContext,
  document: DocumentRow,
  caseAccess: CaseAccessInfo
): boolean {
  if (document.status === "deleted") return false;
  if (document.status === "active") return true;

  if (document.status === "restricted") {
    if (ctx.isAdmin) return true;
    if (isOrgLeadership(ctx.orgRole)) return true;
    if (document.uploaded_by_user_id === ctx.userId) return true;
    if (caseAccess.role === "owner") return true;
    if (caseAccess.can_edit) return true;
    return false;
  }

  return false;
}

async function buildDocumentCaseAccessInfo(params: {
  ctx: AuthContext;
  caseRow: CaseRowMinimal;
  accessRow: { role?: string | null; can_view?: boolean; can_edit?: boolean } | null;
}): Promise<CaseAccessInfo | null> {
  const { ctx, caseRow, accessRow } = params;
  const hasExplicitCaseAccess = accessRow?.can_view === true;

  const { allowed } = assertOwnOrOrgCaseAccess({
    ctx,
    caseRow,
    hasExplicitCaseAccess,
  });
  if (!allowed) return null;

  if (ctx.isAdmin) {
    return { role: "admin", can_view: true, can_edit: true };
  }
  if (sameUserId(caseRow.owner_user_id, ctx.userId)) {
    return { role: "owner", can_view: true, can_edit: true };
  }

  const caseOrgId = caseRow.organization_id ?? null;
  const orgMatches = !!(ctx.orgId && caseOrgId && ctx.orgId === caseOrgId);
  const orgStaff = isOrgStaff(ctx, orgMatches);

  if (orgStaff && orgMatches) {
    const canEdit = orgMemberCanEditCase(ctx, caseRow);
    return {
      role: (ctx.orgRole as SimpleOrgRole) ?? "org",
      can_view: true,
      can_edit: canEdit,
    };
  }

  if (accessRow?.can_view) {
    return {
      role: accessRow.role ?? "viewer",
      can_view: true,
      can_edit: accessRow.can_edit ?? false,
    };
  }
  return null;
}

export async function getDocumentById(params: {
  documentId: string;
  ctx: AuthContext;
  req?: Request | null;
}): Promise<DocumentRow | null> {
  const { documentId, ctx, req: _req } = params;
  void _req;
  const supabase = getSupabaseAdmin();

  const { data: doc, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (error) throw new AppError("INTERNAL", "Document lookup failed", undefined, 500);
  if (!doc) return null;

  const row = doc as unknown as DocumentRow;
  const caseId = row.case_id;

  if (!caseId) {
    const caseOrgId = row.organization_id;
    const allowed =
      ctx.isAdmin || (ctx.orgId && caseOrgId && ctx.orgId === caseOrgId);
    if (!allowed) return null;
    return row;
  }

  const { data: caseRow } = await supabase
    .from("cases")
    .select("organization_id, owner_user_id, assigned_advocate_id, id")
    .eq("id", caseId)
    .maybeSingle();
  if (!caseRow) return null;

  const { data: accessRow } = await supabase
    .from("case_access")
    .select("can_view")
    .eq("case_id", caseId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  const hasExplicitCaseAccess = accessRow?.can_view === true;
  const { allowed } = assertOwnOrOrgCaseAccess({
    ctx,
    caseRow: caseRow as CaseRowMinimal,
    hasExplicitCaseAccess,
  });
  if (!allowed) return null;

  return row;
}

export async function listCaseDocuments(params: {
  caseId: string;
  ctx: AuthContext;
  includeRestricted?: boolean;
  req?: Request | null;
  /** When set, skips a second `cases` fetch — avoids redundant PostgREST calls that were erroring after a successful `select(*)`. */
  preloadedCaseRow?: CaseRowMinimal | null;
}): Promise<DocumentRow[]> {
  const { caseId: rawCaseId, ctx, includeRestricted = false, req: _req, preloadedCaseRow } = params;
  void _req;
  const caseId = normalizeCaseIdParam(rawCaseId);
  const supabase = getSupabaseAdmin();

  let caseRow: CaseRowMinimal;
  if (preloadedCaseRow) {
    caseRow = preloadedCaseRow;
  } else {
    const { data: fetched, error: caseErr } = await supabase
      .from("cases")
      .select("id, organization_id, owner_user_id, assigned_advocate_id")
      .eq("id", caseId)
      .maybeSingle();

    if (caseErr) {
      logger.error("documents.list_case_lookup_failed", {
        caseId,
        message: String(caseErr.message ?? ""),
        code: String((caseErr as { code?: string }).code ?? ""),
      });
      throw new AppError("INTERNAL", "Case lookup failed", undefined, 500);
    }
    if (!fetched) throw new AppError("NOT_FOUND", "Case not found", undefined, 404);
    caseRow = fetched as CaseRowMinimal;
  }

  const { data: accessRow, error: accessError } = await supabase
    .from("case_access")
    .select("can_view, can_edit, role")
    .eq("case_id", caseId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (accessError) throw new AppError("INTERNAL", "Permission lookup failed", undefined, 500);

  const access = await buildDocumentCaseAccessInfo({
    ctx,
    caseRow: caseRow as CaseRowMinimal,
    accessRow,
  });
  if (!access) {
    throw new AppError("NOT_FOUND", "Case not found", undefined, 404);
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

export async function assertDocumentAccess(params: {
  documentId: string;
  ctx: AuthContext;
  accessType: "view" | "download";
  req?: Request | null;
}): Promise<DocumentRow> {
  const { documentId, ctx, accessType: _accessType, req } = params;
  void _accessType;
  const doc = await getDocumentById({ documentId, ctx, req });
  if (!doc) throw new AppError("NOT_FOUND", "Document not found", undefined, 404);
  if (doc.status === "deleted")
    throw new AppError("DOCUMENT_DELETED", "This document has been deleted", undefined, 404);

  const caseId = doc.case_id;
  if (!caseId) throw new AppError("FORBIDDEN", "Document not attached to a case", undefined, 403);

  const supabase = getSupabaseAdmin();
  const { data: caseRow } = await supabase
    .from("cases")
    .select("organization_id, owner_user_id, assigned_advocate_id, id")
    .eq("id", caseId)
    .maybeSingle();

  const { data: accessRow } = await supabase
    .from("case_access")
    .select("role, can_view, can_edit")
    .eq("case_id", caseId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  const access = await buildDocumentCaseAccessInfo({
    ctx,
    caseRow: (caseRow ?? {}) as CaseRowMinimal,
    accessRow,
  });
  if (!access) {
    throw new AppError("DOCUMENT_ACCESS_DENIED", "Access denied", undefined, 403);
  }
  if (!canAccessDocument(ctx, doc, access)) {
    if (doc.status === "restricted")
      throw new AppError("DOCUMENT_RESTRICTED", "This document is restricted", undefined, 403);
    throw new AppError("DOCUMENT_ACCESS_DENIED", "Access denied", undefined, 403);
  }
  return doc;
}

export async function softDeleteDocument(params: {
  documentId: string;
  ctx: AuthContext;
  req?: Request | null;
}): Promise<DocumentRow> {
  const { documentId, ctx, req } = params;
  const doc = await getDocumentById({ documentId, ctx, req });
  if (!doc) throw new AppError("NOT_FOUND", "Document not found", undefined, 404);
  if (doc.status === "deleted") return doc;

  const caseId = doc.case_id;
  let canDelete = ctx.isAdmin || doc.uploaded_by_user_id === ctx.userId;

  if (!canDelete && caseId) {
    const supabase = getSupabaseAdmin();
    const { data: caseRow } = await supabase
      .from("cases")
      .select("organization_id, owner_user_id, assigned_advocate_id, id")
      .eq("id", caseId)
      .maybeSingle();
    const { data: acc } = await supabase
      .from("case_access")
      .select("can_edit")
      .eq("case_id", caseId)
      .eq("user_id", ctx.userId)
      .maybeSingle();
    const hasExplicit = acc?.can_edit === true;
    const orgMatches = !!(
      ctx.orgId &&
      caseRow &&
      (caseRow as { organization_id?: string }).organization_id === ctx.orgId
    );
    const orgStaff = isOrgStaff(ctx, orgMatches);

    if (orgStaff && orgMatches && caseRow) {
      const cr = caseRow as CaseRowMinimal;
      canDelete = orgMemberCanEditCase(ctx, cr);
    } else if (hasExplicit) {
      canDelete = true;
    }
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

  let canRestrict = ctx.isAdmin || isOrgLeadership(ctx.orgRole);
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
