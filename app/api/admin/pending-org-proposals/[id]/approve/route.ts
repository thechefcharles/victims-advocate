/**
 * Admin: approve a pending organization proposal. Creates the org and adds proposer as org_admin.
 */

import {
  getAuthContext,
  requireFullAccess,
} from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { createNotification } from "@/lib/server/notifications/create";
import { syncOrganizationLifecycleFromOwnership } from "@/lib/server/organizations/state";

function appBaseUrl(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    req.headers.get("origin") ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const { id: proposalId } = await params;
    const pid = proposalId?.trim();
    if (!pid) {
      return apiFail("VALIDATION_ERROR", "Missing proposal id", undefined, 422);
    }

    const supabase = getSupabaseAdmin();

    const { data: proposal, error: fetchErr } = await supabase
      .from("pending_organization_proposals")
      .select("id, created_by, name, type, address, phone, website, program_type, notes, status")
      .eq("id", pid)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!proposal) {
      return apiFail("NOT_FOUND", "Proposal not found", undefined, 404);
    }
    if (proposal.status !== "pending") {
      return apiFail("VALIDATION_ERROR", "Proposal is no longer pending", undefined, 409);
    }

    const { data: existingMem } = await supabase
      .from("org_memberships")
      .select("id")
      .eq("user_id", proposal.created_by)
      .eq("status", "active")
      .maybeSingle();

    if (existingMem) {
      const now = new Date().toISOString();
      await supabase
        .from("pending_organization_proposals")
        .update({
          status: "declined",
          resolved_at: now,
          resolved_by: ctx.userId,
          updated_at: now,
        })
        .eq("id", pid);
      return apiFail(
        "VALIDATION_ERROR",
        "Proposer already belongs to an organization",
        undefined,
        409
      );
    }

    const metadata: Record<string, unknown> = {
      address: proposal.address || undefined,
      phone: proposal.phone || undefined,
      website: proposal.website || undefined,
      program_type: proposal.program_type || undefined,
      notes: proposal.notes || undefined,
    };

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({
        name: proposal.name,
        type: proposal.type,
        status: "active",
        created_by: proposal.created_by,
        catalog_entry_id: null,
        metadata,
      })
      .select("id, created_at, name, type, status")
      .single();

    if (orgErr || !org) {
      throw new Error(orgErr?.message ?? "Failed to create organization");
    }

    const { error: memErr } = await supabase.from("org_memberships").insert({
      user_id: proposal.created_by,
      organization_id: org.id,
      org_role: "org_owner",
      status: "active",
      created_by: proposal.created_by,
    });

    if (memErr) {
      await supabase.from("organizations").delete().eq("id", org.id);
      throw new Error(memErr.message);
    }

    await syncOrganizationLifecycleFromOwnership(supabase, org.id);

    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("pending_organization_proposals")
      .update({
        status: "approved",
        resolved_at: now,
        resolved_by: ctx.userId,
        updated_at: now,
      })
      .eq("id", pid);

    if (updErr) throw new Error(updErr.message);

    const base = appBaseUrl(req);
    await createNotification(
      {
        userId: proposal.created_by,
        organizationId: org.id,
        type: "org_proposal_approved",
        title: "Organization approved",
        body: `Your organization "${proposal.name}" has been approved. You're now the organization admin. Open your dashboard to get started.`,
        actionUrl: `${base}/organization/dashboard`,
        previewSafe: true,
        metadata: {
          proposal_id: pid,
          organization_id: org.id,
          organization_name: proposal.name,
        },
      },
      ctx
    );

    await logEvent({
      ctx,
      action: "admin.org_proposal.approved",
      resourceType: "pending_organization_proposal",
      resourceId: pid,
      organizationId: org.id,
      metadata: {
        proposal_id: pid,
        created_by: proposal.created_by,
        organization_name: proposal.name,
      },
      req,
    });

    return apiOk({ organization: org });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.pending_org_proposal.approve.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
