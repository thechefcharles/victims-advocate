/**
 * Org invites — list (leadership) and create (management).
 * Domain 3.2: auth via can(). Admin bypass for listing with organization_id param.
 * Self-serve invite roles restricted to ORG_SELF_SERVE_INVITE_ROLES.
 */

import {
  getAuthContext,
  requireFullAccess,
  requireOrg,
  ORG_SELF_SERVE_INVITE_ROLES,
  normalizeOrgRoleInput,
} from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { listOrgInvites, createOrgInvite } from "@/lib/server/organizations/inviteService";

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
    }

    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("organization_id")?.trim();
    const orgId = isAdmin && orgIdParam ? orgIdParam : ctx.orgId!;

    if (!orgId) {
      return apiFail("VALIDATION_ERROR", "organization_id required when not in an org", undefined, 422);
    }

    const actor = buildActor(ctx);
    const decision = await can("org:invite", actor, { type: "org", id: orgId, ownerId: orgId });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const invites = await listOrgInvites(orgId, ctx);
    return apiOk({ invites });
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

    const actor = buildActor(ctx);
    const decision = await can("org:invite", actor, { type: "org", id: ctx.orgId!, ownerId: ctx.orgId! });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const rawRole =
      typeof body.org_role === "string" ? body.org_role.trim().toLowerCase() : "victim_advocate";
    const orgRole = normalizeOrgRoleInput(rawRole) ?? "victim_advocate";
    const expiryDays =
      typeof body.expiry_days === "number" && body.expiry_days > 0
        ? Math.min(body.expiry_days, 30)
        : 7;

    if (!email) {
      return apiFail("VALIDATION_ERROR", "email is required", undefined, 422);
    }
    if (!isValidEmail(email)) {
      return apiFail("VALIDATION_ERROR", "That email doesn't look right. Check for typos and use a format like name@example.com.", undefined, 422);
    }
    if (!(ORG_SELF_SERVE_INVITE_ROLES as readonly string[]).includes(orgRole)) {
      return apiFail(
        "FORBIDDEN",
        `Self-serve invites may only use: ${ORG_SELF_SERVE_INVITE_ROLES.join(", ")}. Owner roles are assigned via claim or admin flows.`,
        undefined,
        403
      );
    }

    const { invite, rawToken } = await createOrgInvite(
      { email, orgRole, expiryDays },
      ctx,
    );

    await logEvent({
      ctx,
      action: "member_invited",
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
    const acceptUrl = `${baseUrl.replace(/\/$/, "")}/invite/accept?token=${rawToken}`;

    return apiOk({ invite: { ...invite, accept_url: acceptUrl } }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.invites.create.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
