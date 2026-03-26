/**
 * Phase 3: Org owner submits organization for platform review of public activation.
 * Sets public_profile_status → pending_review (admin must approve to set active).
 */

import {
  getAuthContext,
  requireFullAccess,
  requireOrg,
  requireOrgRole,
  requireActiveAccount,
} from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import {
  getOrganizationProfileForContext,
  organizationRowToProfileRow,
} from "@/lib/server/organizations/profile";
import { canOrganizationSubmitForActivation } from "@/lib/server/organizations/state";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireActiveAccount(ctx, req);
    requireOrg(ctx);
    requireOrgRole(ctx, "owner");

    const profileRow = await getOrganizationProfileForContext({ ctx, organizationId: ctx.orgId });
    if (profileRow.status !== "active") {
      return apiFail("VALIDATION_ERROR", "Organization must be active to submit for review.", undefined, 422);
    }

    const eligibility = canOrganizationSubmitForActivation({
      lifecycle_status: profileRow.lifecycle_status,
      public_profile_status: profileRow.public_profile_status,
      name: profileRow.name,
      profile: {
        service_types: profileRow.service_types,
        languages: profileRow.languages,
        coverage_area: profileRow.coverage_area,
        intake_methods: profileRow.intake_methods,
        hours: profileRow.hours,
        accepting_clients: profileRow.accepting_clients,
        capacity_status: profileRow.capacity_status,
        avg_response_time_hours: profileRow.avg_response_time_hours,
        special_populations: profileRow.special_populations,
        accessibility_features: profileRow.accessibility_features,
        profile_status: profileRow.profile_status,
        profile_stage: profileRow.profile_stage,
        profile_last_updated_at: profileRow.profile_last_updated_at,
      },
    });

    if (!eligibility.ok) {
      return apiFail("VALIDATION_ERROR", eligibility.reason, undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { data: updated, error: upErr } = await supabase
      .from("organizations")
      .update({
        public_profile_status: "pending_review",
        activation_submitted_at: now,
      })
      .eq("id", ctx.orgId)
      .select("*")
      .single();

    if (upErr || !updated) {
      throw new Error(upErr?.message ?? "Failed to update organization");
    }

    await logEvent({
      ctx,
      action: "org.activation.submitted",
      resourceType: "organization",
      resourceId: ctx.orgId,
      organizationId: ctx.orgId,
      metadata: {
        name: profileRow.name,
        public_profile_status: "pending_review",
      },
      req,
    });

    logger.info("org.activation.submitted", { orgId: ctx.orgId, userId: ctx.userId });

    const row = updated as Record<string, unknown>;
    const out = organizationRowToProfileRow(row);
    const { metadata: _m, ...profileRest } = out;

    return apiOk({
      message: "Your organization has been submitted for review. A platform administrator will follow up.",
      profile: profileRest,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.submit_for_review.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
