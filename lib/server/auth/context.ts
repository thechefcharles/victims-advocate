/**
 * Phase 0: Single source of truth for auth context (server-side).
 * API routes obtain consistent auth object via getAuthContext(req).
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { config } from "@/lib/config";
import { AppError } from "@/lib/server/api";

export type ProfileRole = "victim" | "advocate" | "organization";

export type OrgRole = "staff" | "supervisor" | "org_admin";

export type AccountStatus = "active" | "disabled" | "deleted";

export type AuthContext = {
  user: { id: string; email?: string };
  userId: string;
  role: ProfileRole;
  /** For admins: underlying profile role when using "view as" override. */
  realRole?: ProfileRole;
  orgId: string | null;
  orgRole: OrgRole | null;
  isAdmin: boolean;
  emailVerified: boolean;
  accountStatus: AccountStatus;
};

function getToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export async function getAuthContext(req: Request): Promise<AuthContext | null> {
  const token = getToken(req);
  if (!token) return null;

  const { url, anonKey } = config.supabase;
  const supabaseAnon = createClient(url, anonKey);

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) return null;

  const userId = data.user.id;
  const supabaseAdmin = getSupabaseAdmin();

  const { data: profile, error: profError } = await supabaseAdmin
    .from("profiles")
    .select("role, organization, is_admin, account_status")
    .eq("id", userId)
    .maybeSingle();

  if (profError) {
    // Profile may not exist for new users; treat as victim
  }

  const rawRole = profile?.role;
  const role: ProfileRole =
    rawRole === "advocate"
      ? "advocate"
      : rawRole === "organization"
        ? "organization"
        : "victim";
  const isAdmin = Boolean(profile?.is_admin);

  const rawStatus = profile?.account_status;
  const accountStatus: AccountStatus =
    rawStatus === "disabled" || rawStatus === "deleted"
      ? rawStatus
      : "active";

  const emailVerified = Boolean(data.user.email_confirmed_at);

  // Phase 2: org membership from org_memberships (replaces profiles.organization)
  const { data: membership } = await supabaseAdmin
    .from("org_memberships")
    .select("organization_id, org_role")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const orgId = membership?.organization_id ?? null;
  const orgRole =
    membership?.org_role && ["staff", "supervisor", "org_admin"].includes(membership.org_role)
      ? (membership.org_role as OrgRole)
      : null;

  let effectiveRole = role;
  const viewAsActive = isAdmin && req ? parseViewAsRoleCookie(req) : null;
  if (viewAsActive === "victim" || viewAsActive === "advocate") {
    effectiveRole = viewAsActive;
  }

  return {
    user: { id: userId, email: data.user.email ?? undefined },
    userId,
    role: effectiveRole,
    /** When admin uses "view as", this is the underlying profile role. */
    realRole: role,
    orgId,
    orgRole,
    isAdmin,
    emailVerified,
    accountStatus,
  };
}

/** Parse view_as_role cookie (admin-only override for testing). */
function parseViewAsRoleCookie(req: Request): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  const match = raw.match(/\bview_as_role=([^;]*)/);
  const value = match?.[1]?.trim().toLowerCase();
  return value === "victim" || value === "advocate" ? value : null;
}

/** Phase 2: Extract org context from auth (convenience helper). */
export function getOrgContext(ctx: AuthContext): { orgId: string; orgRole: OrgRole } | null {
  if (!ctx.orgId || !ctx.orgRole) return null;
  return { orgId: ctx.orgId, orgRole: ctx.orgRole };
}
