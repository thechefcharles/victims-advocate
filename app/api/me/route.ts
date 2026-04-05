/**
 * Phase 2: Returns current auth context for client (role, org, etc).
 */

import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { apiFail, apiFailFromError, apiOk, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getPersonalInfoForUserId } from "@/lib/server/profile/getPersonalInfo";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { parseAdvocatePersonalInfo } from "@/lib/personalInfo";
import { getLegalConsentNextPath, type ProfileLegalConsentFields } from "@/lib/legal/legalConsentFlow";
import { getPlatformStatus } from "@/lib/legal/platformLegalConfig";

type OrgOwnershipClaimPayload = {
  id: string;
  organizationId: string;
  organizationName: string;
  status: "pending" | "rejected";
  submittedAt: string;
  reviewedAt: string | null;
  reviewerNote: string | null;
};

async function fetchOrgOwnershipClaimForMe(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string
): Promise<OrgOwnershipClaimPayload | null> {
  const { data: pending, error: pendErr } = await supabase
    .from("org_claim_requests")
    .select("id, organization_id, submitted_at, reviewed_at, reviewer_note, organizations(name)")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendErr) throw new Error(pendErr.message);

  if (pending) {
    const o = pending.organizations as { name?: string } | null | undefined;
    return {
      id: pending.id as string,
      organizationId: pending.organization_id as string,
      organizationName: o?.name ?? "Organization",
      status: "pending",
      submittedAt: pending.submitted_at as string,
      reviewedAt: (pending.reviewed_at as string | null) ?? null,
      reviewerNote: (pending.reviewer_note as string | null) ?? null,
    };
  }

  const { data: rejected, error: rejErr } = await supabase
    .from("org_claim_requests")
    .select("id, organization_id, submitted_at, reviewed_at, reviewer_note, organizations(name)")
    .eq("user_id", userId)
    .eq("status", "rejected")
    .order("reviewed_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (rejErr) throw new Error(rejErr.message);

  if (rejected) {
    const o = rejected.organizations as { name?: string } | null | undefined;
    return {
      id: rejected.id as string,
      organizationId: rejected.organization_id as string,
      organizationName: o?.name ?? "Organization",
      status: "rejected",
      submittedAt: rejected.submitted_at as string,
      reviewedAt: (rejected.reviewed_at as string | null) ?? null,
      reviewerNote: (rejected.reviewer_note as string | null) ?? null,
    };
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) {
      return apiFail("AUTH_REQUIRED", "Unauthorized", undefined, 401);
    }

    let personalInfo = null;
    let advocatePersonalInfo = null;
    let organizationName: string | null = null;
    let orgOwnershipClaim: OrgOwnershipClaimPayload | null = null;

    if (ctx.role === "victim") {
      try {
        personalInfo = await getPersonalInfoForUserId(ctx.userId);
      } catch (e) {
        logger.warn("me.get.personal_info", { message: String(e) });
      }
    } else if (ctx.role === "advocate") {
      try {
        const supabase = getSupabaseAdmin();
        const { data: prof } = await supabase
          .from("profiles")
          .select("personal_info")
          .eq("id", ctx.userId)
          .maybeSingle();
        advocatePersonalInfo = parseAdvocatePersonalInfo(prof?.personal_info);
        if (ctx.orgId) {
          const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", ctx.orgId)
            .maybeSingle();
          organizationName = (org?.name as string | undefined)?.trim() || null;
        }
      } catch (e) {
        logger.warn("me.get.advocate_personal_info", { message: String(e) });
      }
    }

    // Onboarding: org-signup intent without membership — not org authorization
    if ((ctx.role === "organization" || ctx.realRole === "organization") && !ctx.orgId) {
      try {
        const supabase = getSupabaseAdmin();
        orgOwnershipClaim = await fetchOrgOwnershipClaimForMe(supabase, ctx.userId);
      } catch (e) {
        logger.warn("me.get.org_ownership_claim", { message: String(e) });
      }
    }

    let legalConsentNextPath: string | null = null;
    let legalProfile: ProfileLegalConsentFields | null = null;
    try {
      const supabase = getSupabaseAdmin();
      const { data: lp } = await supabase
        .from("profiles")
        .select(
          "terms_accepted_at, terms_version, privacy_policy_accepted_at, privacy_policy_version, liability_waiver_accepted_at, liability_waiver_version, beta_platform_ack_at, beta_platform_ack_version"
        )
        .eq("id", ctx.userId)
        .maybeSingle();
      if (lp) {
        legalProfile = lp as ProfileLegalConsentFields;
        legalConsentNextPath = getLegalConsentNextPath(legalProfile, getPlatformStatus());
      }
    } catch (e) {
      logger.warn("me.get.legal_consent", { message: String(e) });
    }

    return apiOk({
      userId: ctx.userId,
      email: ctx.user.email ?? null,
      role: ctx.role,
      realRole: ctx.realRole ?? ctx.role,
      isAdmin: ctx.isAdmin,
      orgId: ctx.orgId,
      orgRole: ctx.orgRole,
      affiliatedCatalogEntryId: ctx.affiliatedCatalogEntryId,
      organizationCatalogEntryId: ctx.organizationCatalogEntryId,
      emailVerified: ctx.emailVerified,
      accountStatus: ctx.accountStatus,
      personalInfo,
      advocatePersonalInfo,
      organizationName,
      orgOwnershipClaim,
      legalConsentNextPath,
      platformStatus: getPlatformStatus(),
      termsVersionAccepted: legalProfile?.terms_version ?? null,
      termsAcceptedAt: legalProfile?.terms_accepted_at ?? null,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("me.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
