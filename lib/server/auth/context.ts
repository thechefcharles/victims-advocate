/**
 * Phase 0: Single source of truth for auth context (server-side).
 * API routes obtain consistent auth object via getAuthContext(req).
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { config } from "@/lib/config";
import { AppError } from "@/lib/server/api";

export type ProfileRole = "victim" | "advocate";

export type AuthContext = {
  user: { id: string; email?: string };
  userId: string;
  role: ProfileRole;
  orgId: string | null;
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
  const orgId =
    typeof profile?.organization === "string" && profile.organization.trim()
      ? profile.organization.trim()
      : null;
  const isAdmin = Boolean(profile?.is_admin);

  return {
    user: { id: userId, email: data.user.email ?? undefined },
    userId,
    role,
    orgId,
    isAdmin,
  };
}
