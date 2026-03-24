/**
 * Phase 0: Centralized case data access.
 * Phase 3: Org-scoped; returns NOT_FOUND for cross-org access (no existence leak).
 * Phase 6: Documents via listCaseDocuments (status + restricted visibility).
 * ORG-2A: org_role_permissions + assignment / supervisor scope for org staff.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { isOrgLeadership } from "@/lib/server/auth";
import {
  evaluateOrgMemberCaseAccess,
  fetchSuperviseeUserIds,
  type CaseRowLike,
} from "@/lib/server/auth/orgCaseAccess";
import { getOrgPermissionScope } from "@/lib/server/auth/orgMatrix";
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

function isOrgStaff(ctx: AuthContext, orgMatches: boolean): boolean {
  return (
    orgMatches &&
    (ctx.role === "advocate" || ctx.role === "organization") &&
    Boolean(ctx.orgRole)
  );
}

export async function getCaseById(params: {
  caseId: string;
  ctx: AuthContext;
  req?: Request | null;
}): Promise<GetCaseByIdResult | null> {
  const { caseId, ctx, req } = params;
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
  const orgStaff = isOrgStaff(ctx, orgMatches);

  let viewAllowed = ctx.isAdmin || isOwner;

  if (!viewAllowed && orgStaff) {
    const ok = await evaluateOrgMemberCaseAccess({
      ctx,
      caseRow: caseRow as CaseRowLike,
      permissionAction: "view",
      req,
    });
    if (!ok) {
      return null;
    }
    viewAllowed = true;
  }

  if (!viewAllowed && hasExplicitCaseAccess) {
    viewAllowed = true;
  }

  if (!viewAllowed) {
    return null;
  }

  let access: CaseAccess;
  if (ctx.isAdmin) {
    access = { role: "admin", can_view: true, can_edit: true };
  } else if (isOwner) {
    access = { role: "owner", can_view: true, can_edit: true };
  } else if (orgStaff && orgMatches) {
    const canEdit = await evaluateOrgMemberCaseAccess({
      ctx,
      caseRow: caseRow as CaseRowLike,
      permissionAction: "edit",
      req,
    });
    access = {
      role: (ctx.orgRole as string) ?? "org",
      can_view: true,
      can_edit: canEdit,
    };
  } else if (accessRow?.can_view) {
    access = accessRow as CaseAccess;
  } else {
    return null;
  }

  const includeRestricted = ctx.isAdmin || isOrgLeadership(ctx.orgRole);
  const documents = await listCaseDocuments({
    caseId,
    ctx,
    includeRestricted,
    req,
  });

  return {
    case: caseRow as CaseRow,
    documents: documents as DocumentRow[],
    access,
  };
}

/** ORG-2A: Resolve case row after org + matrix checks (for routes that only need the case). */
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

  let rows = (data ?? []).filter((r: { cases?: unknown }) => r?.cases);

  if (!ctx.isAdmin && ctx.orgId) {
    rows = rows.filter((r) => (r as { cases?: { organization_id?: string } }).cases?.organization_id === ctx.orgId);
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
      const ok = await evaluateOrgMemberCaseAccess({
        ctx,
        caseRow: c as CaseRowLike,
        permissionAction: "view",
        req,
      });
      if (!ok) continue;
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

/**
 * Phase 14: List all cases for an organization. Use only when caller has cases.view scope `all`.
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

/** ORG-2A: Supervisor team + unassigned pool within an org. */
export async function listCasesForSupervisorTeam(params: {
  organizationId: string;
  supervisorUserId: string;
}): Promise<CaseRow[]> {
  const { organizationId, supervisorUserId } = params;
  const supervisees = await fetchSuperviseeUserIds(supervisorUserId, organizationId);
  const ids = Array.from(supervisees);

  const supabaseAdmin = getSupabaseAdmin();
  let q = supabaseAdmin
    .from("cases")
    .select("*")
    .eq("organization_id", organizationId);

  if (ids.length === 0) {
    q = q.or(
      `assigned_advocate_id.is.null,assigned_advocate_id.eq.${supervisorUserId}`
    );
  } else {
    const inList = ids.join(",");
    q = q.or(
      `assigned_advocate_id.is.null,assigned_advocate_id.eq.${supervisorUserId},assigned_advocate_id.in.(${inList})`
    );
  }

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new AppError("INTERNAL", "Failed to list supervisor cases", undefined, 500);
  return (data ?? []) as CaseRow[];
}

/** ORG-2A: Cases assigned to the current user within an org. */
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
 * ORG-2A: Command center / org-wide listing by permission scope (cached matrix read inside getOrgPermissionScope).
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

  const viewScope = await getOrgPermissionScope(ctx.orgRole, "cases", "view");
  if (viewScope === null || viewScope === "none") {
    return [];
  }

  if (viewScope === "all") {
    const rows = await listCasesForOrganization({ organizationId: ctx.orgId });
    return rows.map((c) => ({
      ...c,
      access: { role: "advocate", can_view: true, can_edit: true },
    })) as CaseListItem[];
  }

  if (viewScope === "team") {
    const rows = await listCasesForSupervisorTeam({
      organizationId: ctx.orgId,
      supervisorUserId: ctx.userId,
    });
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
