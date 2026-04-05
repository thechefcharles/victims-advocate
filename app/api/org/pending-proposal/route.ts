/**
 * Submit a new organization proposal when the org is not in the Illinois directory.
 * Creates a pending_organization_proposals row. Admin approves later.
 */

import { getAuthContext, requireAuth, requireActiveAccount, requireRole } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { ORG_TYPES } from "@/lib/server/org/createOrganizationForUser";
import { normalizeOrganizationWebsite } from "@/lib/utils/organizationWebsite";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireActiveAccount(ctx, req);
    requireRole(ctx, "organization");

    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("org_memberships")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return apiFail(
        "VALIDATION_ERROR",
        "You already belong to an organization.",
        undefined,
        400
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim().toLowerCase() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const website =
      typeof body.website === "string" ? normalizeOrganizationWebsite(body.website) : null;
    const programType = typeof body.program_type === "string" ? body.program_type.trim() || null : null;
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

    if (!name) {
      return apiFail("VALIDATION_ERROR", "name is required", undefined, 422);
    }
    if (!ORG_TYPES.includes(type as (typeof ORG_TYPES)[number])) {
      return apiFail(
        "VALIDATION_ERROR",
        `type must be one of: ${ORG_TYPES.join(", ")}`,
        undefined,
        422
      );
    }

    const { data: proposal, error } = await supabase
      .from("pending_organization_proposals")
      .insert({
        created_by: ctx.userId,
        status: "pending",
        name,
        type,
        address,
        phone,
        website,
        program_type: programType,
        notes,
      })
      .select("id, created_at, name, type, status")
      .single();

    if (error) {
      logger.error("org.pending_proposal.insert", { message: error.message });
      return apiFailFromError(toAppError(new Error(error.message)));
    }

    await logEvent({
      ctx,
      action: "org.pending_proposal.created",
      resourceType: "pending_organization_proposal",
      resourceId: proposal.id,
      metadata: { name: proposal.name, type: proposal.type },
      req,
    });

    return apiOk(
      {
        proposal: {
          id: proposal.id,
          created_at: proposal.created_at,
          name: proposal.name,
          type: proposal.type,
          status: proposal.status,
        },
        message:
          "Your organization has been submitted for review. An administrator will approve it soon. You'll receive an update when it's ready.",
      },
      undefined,
      201
    );
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.pending_proposal.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
