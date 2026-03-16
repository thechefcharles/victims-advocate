/**
 * Phase 2: Org invites - create (org_admin), list (org_admin/supervisor).
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess, requireOrg, requireOrgRole } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { sha256Hex } from "@/lib/server/audit/hash";
import { logger } from "@/lib/server/logging";
import { randomBytes } from "crypto";

const ORG_ROLES = ["staff", "supervisor", "org_admin"] as const;
const DEFAULT_EXPIRY_DAYS = 7;

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const isAdmin = ctx.isAdmin;
    if (!isAdmin) {
      requireOrg(ctx);
      requireOrgRole(ctx, ["org_admin", "supervisor"]);
    }

    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("organization_id")?.trim();
    const orgId = isAdmin && orgIdParam ? orgIdParam : ctx.orgId!;

    if (!orgId) {
      return apiFail("VALIDATION_ERROR", "organization_id required when not in an org", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("org_invites")
      .select("id, created_at, email, org_role, expires_at")
      .eq("organization_id", orgId)
      .is("used_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return apiOk({ invites: data ?? [] });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.invites.list.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireOrg(ctx);
    requireOrgRole(ctx, "org_admin");

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 422);
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const orgRole =
      typeof body.org_role === "string"
        ? body.org_role.trim().toLowerCase()
        : "staff";
    const expiryDays =
      typeof body.expiry_days === "number" && body.expiry_days > 0
        ? Math.min(body.expiry_days, 30)
        : DEFAULT_EXPIRY_DAYS;

    if (!email) {
      return apiFail("VALIDATION_ERROR", "email is required", undefined, 422);
    }
    if (!isValidEmail(email)) {
      return apiFail("VALIDATION_ERROR", "Invalid email format", undefined, 422);
    }
    if (!ORG_ROLES.includes(orgRole as (typeof ORG_ROLES)[number])) {
      return apiFail(
        "VALIDATION_ERROR",
        `org_role must be one of: ${ORG_ROLES.join(", ")}`,
        undefined,
        422
      );
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const supabase = getSupabaseAdmin();
    const { data: invite, error } = await supabase
      .from("org_invites")
      .insert({
        organization_id: ctx.orgId!,
        email,
        org_role: orgRole,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        created_by: ctx.userId,
      })
      .select("id, created_at, email, org_role, expires_at")
      .single();

    if (error) throw new Error(error.message);

    await logEvent({
      ctx,
      action: "org.invite.create",
      resourceType: "org_invite",
      resourceId: invite.id,
      organizationId: ctx.orgId!,
      metadata: { email: invite.email, org_role: invite.org_role },
      req,
    });

    const baseUrl =
      typeof process.env.NEXT_PUBLIC_APP_URL === "string"
        ? process.env.NEXT_PUBLIC_APP_URL
        : req.url.replace(/\/api\/org\/invites$/, "");
    const acceptUrl = `${baseUrl.replace(/\/$/, "")}/invite/accept?token=${token}`;

    return apiOk(
      { invite: { ...invite, accept_url: acceptUrl } },
      undefined,
      201
    );
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.invites.create.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
