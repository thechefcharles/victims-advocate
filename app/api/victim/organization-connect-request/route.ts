/**
 * Victim asks to connect with a victim-service organization; notifies org leadership.
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
import { getVictimDisplayForNotification } from "@/lib/server/notifications/applicantDisplay";
import { logEvent } from "@/lib/server/audit/logEvent";
import { ORG_LEADERSHIP_ROLES } from "@/lib/server/auth/orgRoles";
import { isOrganizationMapListable } from "@/lib/server/organizations/organizationsMapData";
import {
  normalizeOrganizationConnectHelpNeeds,
  formatHelpNeedsForOrgNotification,
  type OrganizationConnectHelpNeedKey,
} from "@/lib/victim/organizationConnectHelpNeeds";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function appBaseUrl(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    req.headers.get("origin") ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

const NEED_LABELS_EN: Record<OrganizationConnectHelpNeedKey, string> = {
  general_support: "General support",
  police_report: "Police report",
  medical_bills: "Medical bills",
  employment: "Employment",
  funeral: "Funeral / death-related expenses",
};

async function notifyOrgLeadership(params: {
  ctx: AuthContext;
  req: Request;
  organizationId: string;
  organizationName: string;
  requestId: string;
  victimUserId: string;
  displayName: string;
  email: string | null;
  helpNeedsSummary: string;
}) {
  const {
    ctx,
    req,
    organizationId,
    organizationName,
    requestId,
    victimUserId,
    displayName,
    email,
    helpNeedsSummary,
  } = params;
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
  const needsLine = helpNeedsSummary
    ? `\n\nAreas they need help with: ${helpNeedsSummary}.`
    : "";
  const body = `${identity}\n\nWants to connect with ${organizationName}. They found your organization in Find Organizations.${needsLine}`;

  const recipients = [...new Set((members ?? []).map((m) => m.user_id))];
  await Promise.all(
    recipients.map((userId) =>
      createNotification(
        {
          userId,
          organizationId,
          type: "victim_org_connect_request",
          title: "Someone wants to connect with your organization",
          body,
          actionUrl,
          previewSafe: true,
          metadata: {
            request_id: requestId,
            victim_user_id: victimUserId,
            organization_id: organizationId,
            organization_name: organizationName,
            help_needs_summary: helpNeedsSummary || null,
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
    requireRole(ctx, "victim");

    const body = await req.json().catch(() => ({}));
    const organizationId =
      typeof body?.organization_id === "string" ? body.organization_id.trim() : "";

    if (!organizationId || !UUID_RE.test(organizationId)) {
      return apiFail(
        "VALIDATION_ERROR",
        "We couldn't read that organization link. Go back to the map and choose Connect again.",
        undefined,
        422,
      );
    }

    const helpNeeds = normalizeOrganizationConnectHelpNeeds(body?.help_needs);
    if (helpNeeds.length === 0) {
      return apiFail(
        "VALIDATION_ERROR",
        "Select at least one area you need help with.",
        { field: "help_needs" },
        422
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select(
        "id,name,status,lifecycle_status,public_profile_status,profile_status,profile_stage"
      )
      .eq("id", organizationId)
      .maybeSingle();

    if (orgErr) throw new Error(orgErr.message);
    if (!org || !isOrganizationMapListable(org)) {
      return apiFail("NOT_FOUND", "Organization not found", undefined, 404);
    }

    const { data: pending } = await supabase
      .from("victim_org_connect_requests")
      .select("id")
      .eq("victim_user_id", ctx.userId)
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .maybeSingle();

    if (pending) {
      return apiFail(
        "VALIDATION_ERROR",
        "You already sent a connect request to this organization.",
        { request_id: pending.id },
        409
      );
    }

    const { data: inserted, error: insErr } = await supabase
      .from("victim_org_connect_requests")
      .insert({
        victim_user_id: ctx.userId,
        organization_id: organizationId,
        status: "pending",
        help_needs: helpNeeds,
      })
      .select("id")
      .single();

    if (insErr) {
      if (insErr.code === "23505") {
        return apiFail(
          "VALIDATION_ERROR",
          "You already sent a connect request to this organization.",
          undefined,
          409
        );
      }
      throw new Error(insErr.message);
    }

    const requestId = inserted!.id as string;
    const orgName = String(org.name ?? "Organization");
    const { displayName, email } = await getVictimDisplayForNotification(ctx.userId);
    const helpNeedsSummary = formatHelpNeedsForOrgNotification(helpNeeds, NEED_LABELS_EN);

    await notifyOrgLeadership({
      ctx,
      req,
      organizationId,
      organizationName: orgName,
      requestId,
      victimUserId: ctx.userId,
      displayName,
      email,
      helpNeedsSummary,
    });

    await logEvent({
      ctx,
      action: "org.victim_connect_request.created",
      resourceType: "victim_org_connect_request",
      resourceId: requestId,
      organizationId,
      metadata: { organization_name: orgName, help_needs: helpNeeds },
      req,
    });

    logger.info("victim.org_connect_request.created", {
      requestId,
      victimId: ctx.userId,
      organizationId,
    });

    return apiOk({
      request_id: requestId,
      organization_id: organizationId,
      organization_name: orgName,
      help_needs: helpNeeds,
      message: "The organization’s team has been notified.",
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("victim.organization_connect_request.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
