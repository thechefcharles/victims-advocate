/**
 * Record signup legal consent steps: profile updates + immutable legal_consent_audit
 * + policy_acceptances for terms/privacy when an active policy row exists.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiFail, apiFailFromError, apiOk, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  CURRENT_BETA_PLATFORM_ACK_VERSION,
  CURRENT_LIABILITY_WAIVER_VERSION,
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
  getPlatformStatus,
} from "@/lib/legal/platformLegalConfig";
import { getActivePolicyDocument } from "@/lib/server/policies";

type Step = "terms" | "privacy" | "waiver" | "beta";

function parseInet(ip: string | null): string | null {
  if (!ip?.trim()) return null;
  const trimmed = ip.trim();
  if (trimmed.length > 45) return null;
  return trimmed;
}

function clientIp(req: Request): string | null {
  return (
    parseInet(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null) ??
    parseInet(req.headers.get("x-real-ip")) ??
    null
  );
}

async function ensurePolicyAcceptance(params: {
  userId: string;
  policyId: string;
  docType: string;
  version: string;
  role: string;
  ip: string | null;
  userAgent: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("policy_acceptances")
    .select("id")
    .eq("user_id", params.userId)
    .eq("policy_document_id", params.policyId)
    .limit(1)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from("policy_acceptances").insert({
    user_id: params.userId,
    policy_document_id: params.policyId,
    doc_type: params.docType,
    version: params.version,
    role_at_acceptance: params.role,
    workflow_key: null,
    ip: params.ip,
    user_agent: params.userAgent,
  });

  if (error) throw new Error(error.message);
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail(
        "VALIDATION_ERROR",
        "We couldn't read that request. Refresh the page and try again.",
        undefined,
        422
      );
    }

    const step = (body as { step?: string }).step as Step | undefined;
    if (step !== "terms" && step !== "privacy" && step !== "waiver" && step !== "beta") {
      return apiFail("VALIDATION_ERROR", "Invalid consent step.", undefined, 422);
    }

    const platformStatus = getPlatformStatus();
    if (step === "beta" && platformStatus === "production") {
      return apiFail("VALIDATION_ERROR", "This step is not available on production.", undefined, 422);
    }

    const ip = clientIp(req);
    const userAgent = req.headers.get("user-agent") ?? null;
    const supabase = getSupabaseAdmin();
    const nowIso = new Date().toISOString();

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select(
        "terms_accepted_at, terms_version, privacy_policy_accepted_at, privacy_policy_version, liability_waiver_accepted_at, liability_waiver_version, beta_platform_ack_at, beta_platform_ack_version, legal_user_type, legal_organization_id, legal_accepting_role, role"
      )
      .eq("id", ctx.userId)
      .maybeSingle();

    if (profErr || !profile) {
      return apiFail("NOT_FOUND", "Profile not found.", undefined, 404);
    }

    const roleRow = profile.role as string;

    if (step === "terms") {
      if (profile.terms_version === CURRENT_TERMS_VERSION && profile.terms_accepted_at) {
        return apiOk({ ok: true, step: "terms", idempotent: true });
      }
      const agreeTerms = (body as { agreeTerms?: boolean }).agreeTerms === true;
      const mfaSmsConsent = (body as { mfaSmsConsent?: boolean }).mfaSmsConsent === true;
      const userTypeRaw = (body as { userType?: string }).userType;
      const userType =
        userTypeRaw === "organizational" ? "organizational" : userTypeRaw === "individual" ? "individual" : null;
      const organizationId =
        typeof (body as { organizationId?: string }).organizationId === "string"
          ? (body as { organizationId: string }).organizationId.trim() || null
          : null;
      const acceptingRole =
        typeof (body as { acceptingUserRole?: string }).acceptingUserRole === "string"
          ? (body as { acceptingUserRole: string }).acceptingUserRole.trim() || null
          : null;

      if (!agreeTerms || !mfaSmsConsent) {
        return apiFail(
          "VALIDATION_ERROR",
          "Both agreements are required to continue.",
          undefined,
          422
        );
      }
      if (userType !== "individual" && userType !== "organizational") {
        return apiFail("VALIDATION_ERROR", "A valid user type is required.", undefined, 422);
      }
      if (userType === "organizational" && !organizationId) {
        return apiFail(
          "VALIDATION_ERROR",
          "Organization ID is required for the organizational pathway.",
          undefined,
          422
        );
      }

      const { error: auditErr } = await supabase.from("legal_consent_audit").insert({
        user_id: ctx.userId,
        document_type: "terms_of_use",
        version: CURRENT_TERMS_VERSION,
        accepted_at: nowIso,
        ip,
        user_agent: userAgent,
        user_type: userType,
        mfa_consent_given: true,
        organization_id: organizationId,
        accepting_role: acceptingRole,
        metadata: {},
      });
      if (auditErr) throw new Error(auditErr.message);

      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          terms_accepted_at: nowIso,
          terms_version: CURRENT_TERMS_VERSION,
          terms_accept_ip: ip,
          terms_accept_user_agent: userAgent,
          legal_user_type: userType,
          legal_organization_id: organizationId,
          legal_accepting_role: acceptingRole,
          mfa_sms_consent_given: true,
          mfa_sms_consent_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", ctx.userId);
      if (upErr) throw new Error(upErr.message);

      const termsPolicy = await getActivePolicyDocument({
        docType: "terms_of_use",
        role: ctx.role,
        workflowKey: null,
      });
      if (termsPolicy && termsPolicy.version === CURRENT_TERMS_VERSION) {
        await ensurePolicyAcceptance({
          userId: ctx.userId,
          policyId: termsPolicy.id,
          docType: "terms_of_use",
          version: termsPolicy.version,
          role: roleRow,
          ip,
          userAgent,
        });
      }

      return apiOk({ ok: true, step: "terms" });
    }

    if (step === "privacy") {
      if (!profile.terms_accepted_at || profile.terms_version !== CURRENT_TERMS_VERSION) {
        return apiFail(
          "VALIDATION_ERROR",
          "Complete the Terms of Use step before the Privacy Policy.",
          undefined,
          422
        );
      }
      if (
        profile.privacy_policy_version === CURRENT_PRIVACY_POLICY_VERSION &&
        profile.privacy_policy_accepted_at
      ) {
        return apiOk({ ok: true, step: "privacy", idempotent: true });
      }
      const agree = (body as { agreePrivacy?: boolean }).agreePrivacy === true;
      if (!agree) {
        return apiFail("VALIDATION_ERROR", "Acceptance is required to continue.", undefined, 422);
      }

      const { error: auditErr } = await supabase.from("legal_consent_audit").insert({
        user_id: ctx.userId,
        document_type: "privacy_policy",
        version: CURRENT_PRIVACY_POLICY_VERSION,
        accepted_at: nowIso,
        ip,
        user_agent: userAgent,
        user_type: profile.legal_user_type ?? null,
        mfa_consent_given: null,
        organization_id: profile.legal_organization_id ?? null,
        accepting_role: profile.legal_accepting_role ?? null,
        metadata: {},
      });
      if (auditErr) throw new Error(auditErr.message);

      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          privacy_policy_accepted_at: nowIso,
          privacy_policy_version: CURRENT_PRIVACY_POLICY_VERSION,
          updated_at: nowIso,
        })
        .eq("id", ctx.userId);
      if (upErr) throw new Error(upErr.message);

      const privPolicy = await getActivePolicyDocument({
        docType: "privacy_policy",
        role: ctx.role,
        workflowKey: null,
      });
      if (privPolicy && privPolicy.version === CURRENT_PRIVACY_POLICY_VERSION) {
        await ensurePolicyAcceptance({
          userId: ctx.userId,
          policyId: privPolicy.id,
          docType: "privacy_policy",
          version: privPolicy.version,
          role: roleRow,
          ip,
          userAgent,
        });
      }

      return apiOk({ ok: true, step: "privacy" });
    }

    if (step === "waiver") {
      if (
        !profile.privacy_policy_accepted_at ||
        profile.privacy_policy_version !== CURRENT_PRIVACY_POLICY_VERSION
      ) {
        return apiFail(
          "VALIDATION_ERROR",
          "Complete the Privacy Policy step before the Liability Waiver.",
          undefined,
          422
        );
      }
      if (
        profile.liability_waiver_version === CURRENT_LIABILITY_WAIVER_VERSION &&
        profile.liability_waiver_accepted_at
      ) {
        return apiOk({ ok: true, step: "waiver", idempotent: true });
      }
      const agree = (body as { agreeWaiver?: boolean }).agreeWaiver === true;
      if (!agree) {
        return apiFail("VALIDATION_ERROR", "Acceptance is required to continue.", undefined, 422);
      }

      const { error: auditErr } = await supabase.from("legal_consent_audit").insert({
        user_id: ctx.userId,
        document_type: "liability_waiver",
        version: CURRENT_LIABILITY_WAIVER_VERSION,
        accepted_at: nowIso,
        ip,
        user_agent: userAgent,
        user_type: profile.legal_user_type ?? null,
        mfa_consent_given: null,
        organization_id: profile.legal_organization_id ?? null,
        accepting_role: profile.legal_accepting_role ?? null,
        metadata: {},
      });
      if (auditErr) throw new Error(auditErr.message);

      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          liability_waiver_accepted_at: nowIso,
          liability_waiver_version: CURRENT_LIABILITY_WAIVER_VERSION,
          updated_at: nowIso,
        })
        .eq("id", ctx.userId);
      if (upErr) throw new Error(upErr.message);

      return apiOk({ ok: true, step: "waiver" });
    }

    if (
      !profile.liability_waiver_accepted_at ||
      profile.liability_waiver_version !== CURRENT_LIABILITY_WAIVER_VERSION
    ) {
      return apiFail(
        "VALIDATION_ERROR",
        "Complete the Liability Waiver before the beta acknowledgment.",
        undefined,
        422
      );
    }
    if (
      profile.beta_platform_ack_version === CURRENT_BETA_PLATFORM_ACK_VERSION &&
      profile.beta_platform_ack_at
    ) {
      return apiOk({ ok: true, step: "beta", idempotent: true });
    }

    const agreeBeta = (body as { agreeBeta?: boolean }).agreeBeta === true;
    if (!agreeBeta) {
      return apiFail("VALIDATION_ERROR", "Acceptance is required to continue.", undefined, 422);
    }

    const { error: auditErr } = await supabase.from("legal_consent_audit").insert({
      user_id: ctx.userId,
      document_type: "beta_platform_ack",
      version: CURRENT_BETA_PLATFORM_ACK_VERSION,
      accepted_at: nowIso,
      ip,
      user_agent: userAgent,
      user_type: profile.legal_user_type ?? null,
      mfa_consent_given: null,
      organization_id: profile.legal_organization_id ?? null,
      accepting_role: profile.legal_accepting_role ?? null,
      metadata: {},
    });
    if (auditErr) throw new Error(auditErr.message);

    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        beta_platform_ack_at: nowIso,
        beta_platform_ack_version: CURRENT_BETA_PLATFORM_ACK_VERSION,
        updated_at: nowIso,
      })
      .eq("id", ctx.userId);
    if (upErr) throw new Error(upErr.message);

    return apiOk({ ok: true, step: "beta" });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("legal.consent.step.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
