/**
 * Phase 0: Single source of truth for auth context (server-side).
 * Phase 5: `role` is profile/onboarding persona; org *power* is `orgId` + `orgRole` (membership), not `role === "organization"`.
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { config } from "@/lib/config";
import { AppError } from "@/lib/server/api";
import type { SimpleOrgRole } from "@/lib/auth/simpleOrgRole";
import { mapDbOrgRoleToSimple } from "@/lib/auth/simpleOrgRole";
import type { AccountType } from "@nxtstps/registry";
import { resolveAccountType } from "./resolveAccountType";
import { logEvent } from "@/lib/server/audit/logEvent";

export type ProfileRole = "victim" | "advocate" | "organization";

export type AccountStatus = "active" | "disabled" | "deleted";

/**
 * Server auth snapshot. Core access fields: `user`, `userId`, `role`, `orgId`, `orgRole`, `isAdmin`.
 * `orgRole` is normalized owner | supervisor | advocate (see `mapDbOrgRoleToSimple`) — use for org authorization.
 */
export type AuthContext = {
  user: { id: string; email?: string };
  userId: string;
  role: ProfileRole;
  /** For admins: underlying profile role when using "view as" override. */
  realRole?: ProfileRole;
  orgId: string | null;
  /** Normalized org role for access checks; null if not in an org. */
  orgRole: SimpleOrgRole | null;
  /** Illinois victim assistance directory program id (profile / advocate affiliation). */
  affiliatedCatalogEntryId: number | null;
  /** Directory row for the user's organization (`organizations.catalog_entry_id`). */
  organizationCatalogEntryId: number | null;
  isAdmin: boolean;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  /** 2.0 AccountType derived from legacy role + is_admin. */
  accountType: AccountType;
  /** True when the user's safety mode is active — suppresses notification content. */
  safetyModeEnabled: boolean;
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
    .select("role, organization, is_admin, account_status, affiliated_catalog_entry_id")
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
  const rawOrgRole = membership?.org_role;
  const orgRole =
    typeof rawOrgRole === "string" ? mapDbOrgRoleToSimple(rawOrgRole) : null;

  let organizationCatalogEntryId: number | null = null;
  if (orgId) {
    const { data: orgRow } = await supabaseAdmin
      .from("organizations")
      .select("catalog_entry_id")
      .eq("id", orgId)
      .maybeSingle();
    const rawOrgCat = (orgRow as { catalog_entry_id?: number | null } | null)?.catalog_entry_id;
    organizationCatalogEntryId =
      typeof rawOrgCat === "number" && Number.isFinite(rawOrgCat) ? rawOrgCat : null;
  }

  const rawAff = (profile as { affiliated_catalog_entry_id?: number | null } | null)
    ?.affiliated_catalog_entry_id;
  const affiliatedCatalogEntryId =
    typeof rawAff === "number" && Number.isFinite(rawAff) ? rawAff : null;

  const accountType = resolveAccountType({ role, is_admin: isAdmin });

  const { data: safetySettings } = await supabaseAdmin
    .from("user_safety_settings")
    .select("safety_mode_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  const safetyModeEnabled = safetySettings?.safety_mode_enabled ?? false;

  let effectiveRole = role;
  const viewAsActive = isAdmin && req ? parseViewAsRoleCookie(req) : null;
  if (viewAsActive === "victim" || viewAsActive === "advocate") {
    effectiveRole = viewAsActive;
    void logEvent({
      ctx: {
        user: { id: userId, email: data.user.email ?? undefined },
        userId,
        role,
        realRole: role,
        orgId,
        orgRole,
        affiliatedCatalogEntryId,
        organizationCatalogEntryId,
        isAdmin,
        emailVerified,
        accountStatus,
        accountType,
        safetyModeEnabled,
      },
      action: "auth.view_as_activated",
      severity: "security",
      metadata: { real_role: role, view_as_role: viewAsActive, is_admin: isAdmin },
    });
  }

  return {
    user: { id: userId, email: data.user.email ?? undefined },
    userId,
    role: effectiveRole,
    /** When admin uses "view as", this is the underlying profile role. */
    realRole: role,
    orgId,
    orgRole,
    affiliatedCatalogEntryId,
    organizationCatalogEntryId,
    isAdmin,
    emailVerified,
    accountStatus,
    accountType,
    safetyModeEnabled,
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
export function getOrgContext(ctx: AuthContext): { orgId: string; orgRole: SimpleOrgRole } | null {
  if (!ctx.orgId || !ctx.orgRole) return null;
  return { orgId: ctx.orgId, orgRole: ctx.orgRole };
}
