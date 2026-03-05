/**
 * Phase 0: Single source of truth for auth context (server-side).
 * API routes obtain consistent auth object via getAuthContext(req).
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { config } from "@/lib/config";
import { AppError } from "@/lib/server/api";

export type ProfileRole = "victim" | "advocate";

export type OrgRole = "staff" | "supervisor" | "org_admin";

export type AuthContext = {
  user: { id: string; email?: string };
  userId: string;
  role: ProfileRole;
  orgId: string | null;
  orgRole: OrgRole | null;
  isAdmin: boolean;
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
    .select("role, organization, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (profError) {
    // Profile may not exist for new users; treat as victim
  }

  const role = (profile?.role === "advocate" ? "advocate" : "victim") as ProfileRole;
  const isAdmin = Boolean(profile?.is_admin);

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

  return {
    user: { id: userId, email: data.user.email ?? undefined },
    userId,
    role,
    orgId,
    orgRole,
    isAdmin,
  };
}

/** Phase 2: Extract org context from auth (convenience helper). */
export function getOrgContext(ctx: AuthContext): { orgId: string; orgRole: OrgRole } | null {
  if (!ctx.orgId || !ctx.orgRole) return null;
  return { orgId: ctx.orgId, orgRole: ctx.orgRole };
}
