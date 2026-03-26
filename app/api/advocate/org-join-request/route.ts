/**
 * Advocate submits a request to join an organization (notifies org admins / supervisors).
 */

import {
  getAuthContext,
  requireAuth,
  requireFullAccess,
  requireRole,
  type AuthContext,
} from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import { createNotification } from "@/lib/server/notifications/create";
import { getAdvocateDisplayForNotification } from "@/lib/server/notifications/advocateDisplay";
import { logEvent } from "@/lib/server/audit/logEvent";
import { ORG_LEADERSHIP_ROLES } from "@/lib/server/auth/orgRoles";

function appBaseUrl(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    req.headers.get("origin") ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function notifyOrgApprovers(params: {
  ctx: AuthContext;
  req: Request;
  organizationId: string;
  organizationName: string;
  requestId: string;
  advocateUserId: string;
  displayName: string;
  email: string | null;
}) {
  const { ctx, req, organizationId, organizationName, requestId, advocateUserId, displayName, email } =
    params;
  const supabase = getSupabaseAdmin();
  const { data: members, error } = await supabase
    .from("org_memberships")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .in("org_role", [...ORG_LEADERSHIP_ROLES]);

  if (error) throw new Error(error.message);

  const base = appBaseUrl(req);
  const actionUrl = `${base}/notifications`;
  const identity = `${displayName}${email ? ` · ${email}` : ""}`;
  const body = `${identity}\n\nRequested to join ${organizationName} as a team member. Review in Updates.`;

  const recipients = [...new Set((members ?? []).map((m) => m.user_id))];
  await Promise.all(
    recipients.map((userId) =>
      createNotification(
        {
          userId,
          organizationId,
          type: "advocate_org_join_request",
          title: "Advocate membership request",
          body,
          actionUrl,
          previewSafe: true,
          metadata: {
            request_id: requestId,
            advocate_user_id: advocateUserId,
            organization_id: organizationId,
            organization_name: organizationName,
          },
        },
        ctx
      )
    )
  );
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireFullAccess(ctx, req);
    requireRole(ctx, "advocate");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 422);
    }
    const organizationId =
      typeof (body as { organization_id?: unknown })?.organization_id === "string"
        ? String((body as { organization_id: string }).organization_id).trim()
        : "";

    if (!organizationId) {
      return apiFail("VALIDATION_ERROR", "organization_id is required", undefined, 422);
    }

    const supabase = getSupabaseAdmin();

    const { data: existingMem } = await supabase
      .from("org_memberships")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("status", "active")
      .maybeSingle();

    if (existingMem) {
      return apiFail("VALIDATION_ERROR", "You already belong to an organization", undefined, 409);
    }

    const { data: pending } = await supabase
      .from("advocate_org_join_requests")
      .select("id, organization_id")
      .eq("advocate_user_id", ctx.userId)
      .eq("status", "pending")
      .maybeSingle();

    if (pending) {
      return apiFail(
        "VALIDATION_ERROR",
        "You already have a pending organization request. Wait for a response or contact support.",
        { request_id: pending.id, organization_id: pending.organization_id },
        409
      );
    }

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id,name,status")
      .eq("id", organizationId)
      .maybeSingle();

    if (orgErr) throw new Error(orgErr.message);
    if (!org || org.status !== "active") {
      return apiFail("NOT_FOUND", "Organization not found", undefined, 404);
    }

    const { data: inserted, error: insErr } = await supabase
      .from("advocate_org_join_requests")
      .insert({
        advocate_user_id: ctx.userId,
        organization_id: organizationId,
        status: "pending",
      })
      .select("id")
      .single();

    if (insErr) {
      if (insErr.code === "23505") {
        return apiFail(
          "VALIDATION_ERROR",
          "A pending request already exists for your account",
          undefined,
          409
        );
      }
      throw new Error(insErr.message);
    }

    const requestId = inserted!.id as string;
    const orgName = String(org.name ?? "Organization");
    const { displayName, email } = await getAdvocateDisplayForNotification(ctx.userId);

    await notifyOrgApprovers({
      ctx,
      req,
      organizationId,
      organizationName: orgName,
      requestId,
      advocateUserId: ctx.userId,
      displayName,
      email,
    });

    await logEvent({
      ctx,
      action: "org.join_request.created",
      resourceType: "advocate_org_join_request",
      resourceId: requestId,
      organizationId,
      metadata: { organization_name: orgName },
      req,
    });

    return apiOk({ requestId, organizationId, organizationName: orgName });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("advocate.org_join_request.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
