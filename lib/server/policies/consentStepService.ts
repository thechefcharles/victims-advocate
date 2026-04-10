/**
 * Legal consent step service.
 *
 * Extracted from the 535-line route handler. Each step:
 *   1. Validates prerequisites (prior steps completed)
 *   2. Writes immutable legal_consent_audit record
 *   3. Updates profile with acceptance metadata
 *   4. Creates policy_acceptances record if active policy exists
 *   5. Verifies the write succeeded
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import {
  CURRENT_LIABILITY_WAIVER_VERSION,
  CURRENT_PILOT_ACK_VERSION,
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
  getPlatformStatus,
} from "@/lib/legal/platformLegalConfig";
import { getActivePolicyDocument } from "@/lib/server/policies";

export type ConsentStep = "terms" | "privacy" | "waiver" | "beta";

export type ConsentStepInput = {
  step: ConsentStep;
  userId: string;
  role: string;
  ip: string | null;
  userAgent: string | null;
  body: Record<string, unknown>;
};

export type ConsentStepResult = {
  ok: true;
  step: ConsentStep;
  idempotent?: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensurePolicyAcceptance(params: {
  userId: string;
  policyId: string;
  docType: string;
  version: string;
  role: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<void> {
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
  if (error) throw new AppError("INTERNAL", `Policy acceptance failed: ${error.message}`);
}

async function getProfile(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "terms_accepted_at, terms_version, privacy_policy_accepted_at, privacy_policy_version, liability_waiver_accepted_at, liability_waiver_version, beta_platform_ack_at, beta_platform_ack_version, legal_user_type, legal_organization_id, legal_accepting_role, role",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) throw new AppError("NOT_FOUND", "Profile not found.", undefined, 404);
  return data as Record<string, unknown>;
}

function assertPriorStep(profile: Record<string, unknown>, step: string, version: string, label: string): void {
  if (!profile[`${step}_accepted_at`] || profile[`${step}_version`] !== version) {
    throw new AppError("VALIDATION_ERROR", `Complete the ${label} step first.`, undefined, 422);
  }
}

async function writeAuditAndUpdateProfile(params: {
  userId: string;
  documentType: string;
  version: string;
  profileUpdates: Record<string, unknown>;
  profile: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { error: auditErr } = await supabase.from("legal_consent_audit").insert({
    user_id: params.userId,
    document_type: params.documentType,
    version: params.version,
    accepted_at: nowIso,
    ip: params.ip,
    user_agent: params.userAgent,
    user_type: (params.profile.legal_user_type as string) ?? null,
    mfa_consent_given: params.documentType === "terms_of_use" ? true : null,
    organization_id: (params.profile.legal_organization_id as string) ?? null,
    accepting_role: (params.profile.legal_accepting_role as string) ?? null,
    metadata: {},
  });
  if (auditErr) throw new AppError("INTERNAL", `Audit write failed: ${auditErr.message}`);

  const { error: upErr } = await supabase
    .from("profiles")
    .update({ ...params.profileUpdates, updated_at: nowIso })
    .eq("id", params.userId);
  if (upErr) throw new AppError("INTERNAL", `Profile update failed: ${upErr.message}`);
}

// ---------------------------------------------------------------------------
// Step handlers
// ---------------------------------------------------------------------------

async function processTermsStep(input: ConsentStepInput): Promise<ConsentStepResult> {
  const profile = await getProfile(input.userId);
  if (profile.terms_version === CURRENT_TERMS_VERSION && profile.terms_accepted_at) {
    return { ok: true, step: "terms", idempotent: true };
  }

  const { body } = input;
  if (body.agreeTerms !== true || body.mfaSmsConsent !== true) {
    throw new AppError("VALIDATION_ERROR", "Both agreements are required to continue.", undefined, 422);
  }
  const userType = body.userType === "organizational" ? "organizational" : body.userType === "individual" ? "individual" : null;
  if (!userType) throw new AppError("VALIDATION_ERROR", "A valid user type is required.", undefined, 422);
  const organizationId = typeof body.organizationId === "string" ? (body.organizationId as string).trim() || null : null;
  if (userType === "organizational" && !organizationId) {
    throw new AppError("VALIDATION_ERROR", "Organization ID is required for the organizational pathway.", undefined, 422);
  }
  const acceptingRole = typeof body.acceptingUserRole === "string" ? (body.acceptingUserRole as string).trim() || null : null;

  const nowIso = new Date().toISOString();
  await writeAuditAndUpdateProfile({
    userId: input.userId,
    documentType: "terms_of_use",
    version: CURRENT_TERMS_VERSION,
    profile: { ...profile, legal_user_type: userType, legal_organization_id: organizationId, legal_accepting_role: acceptingRole },
    profileUpdates: {
      terms_accepted_at: nowIso,
      terms_version: CURRENT_TERMS_VERSION,
      terms_accept_ip: input.ip,
      terms_accept_user_agent: input.userAgent,
      legal_user_type: userType,
      legal_organization_id: organizationId,
      legal_accepting_role: acceptingRole,
      mfa_sms_consent_given: true,
      mfa_sms_consent_at: nowIso,
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  const termsPolicy = await getActivePolicyDocument({ docType: "terms_of_use", role: input.role as "victim" | "advocate" | "admin" | "organization" | null, workflowKey: null });
  if (termsPolicy && termsPolicy.version === CURRENT_TERMS_VERSION) {
    await ensurePolicyAcceptance({
      userId: input.userId, policyId: termsPolicy.id, docType: "terms_of_use",
      version: termsPolicy.version, role: profile.role as string, ip: input.ip, userAgent: input.userAgent,
    });
  }

  return { ok: true, step: "terms" };
}

async function processPrivacyStep(input: ConsentStepInput): Promise<ConsentStepResult> {
  const profile = await getProfile(input.userId);
  assertPriorStep(profile, "terms", CURRENT_TERMS_VERSION, "Terms of Use");
  if (profile.privacy_policy_version === CURRENT_PRIVACY_POLICY_VERSION && profile.privacy_policy_accepted_at) {
    return { ok: true, step: "privacy", idempotent: true };
  }
  if (input.body.agreePrivacy !== true) {
    throw new AppError("VALIDATION_ERROR", "Acceptance is required to continue.", undefined, 422);
  }

  const nowIso = new Date().toISOString();
  await writeAuditAndUpdateProfile({
    userId: input.userId,
    documentType: "privacy_policy",
    version: CURRENT_PRIVACY_POLICY_VERSION,
    profile,
    profileUpdates: {
      privacy_policy_accepted_at: nowIso,
      privacy_policy_version: CURRENT_PRIVACY_POLICY_VERSION,
      privacy_policy_accept_ip: input.ip,
      privacy_policy_accept_user_agent: input.userAgent,
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  const privPolicy = await getActivePolicyDocument({ docType: "privacy_policy", role: input.role as "victim" | "advocate" | "admin" | "organization" | null, workflowKey: null });
  if (privPolicy && privPolicy.version === CURRENT_PRIVACY_POLICY_VERSION) {
    await ensurePolicyAcceptance({
      userId: input.userId, policyId: privPolicy.id, docType: "privacy_policy",
      version: privPolicy.version, role: profile.role as string, ip: input.ip, userAgent: input.userAgent,
    });
  }

  return { ok: true, step: "privacy" };
}

async function processWaiverStep(input: ConsentStepInput): Promise<ConsentStepResult> {
  const profile = await getProfile(input.userId);
  assertPriorStep(profile, "terms", CURRENT_TERMS_VERSION, "Terms of Use");
  assertPriorStep(profile, "privacy_policy", CURRENT_PRIVACY_POLICY_VERSION, "Privacy Policy");
  if (profile.liability_waiver_version === CURRENT_LIABILITY_WAIVER_VERSION && profile.liability_waiver_accepted_at) {
    return { ok: true, step: "waiver", idempotent: true };
  }
  if (input.body.agreeWaiver !== true) {
    throw new AppError("VALIDATION_ERROR", "Acceptance is required to continue.", undefined, 422);
  }

  const nowIso = new Date().toISOString();
  await writeAuditAndUpdateProfile({
    userId: input.userId,
    documentType: "liability_waiver",
    version: CURRENT_LIABILITY_WAIVER_VERSION,
    profile,
    profileUpdates: {
      liability_waiver_accepted_at: nowIso,
      liability_waiver_version: CURRENT_LIABILITY_WAIVER_VERSION,
      liability_waiver_accept_ip: input.ip,
      liability_waiver_accept_user_agent: input.userAgent,
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return { ok: true, step: "waiver" };
}

async function processBetaStep(input: ConsentStepInput): Promise<ConsentStepResult> {
  if (getPlatformStatus() === "production") {
    throw new AppError("VALIDATION_ERROR", "This step is not available on production.", undefined, 422);
  }
  const profile = await getProfile(input.userId);
  assertPriorStep(profile, "terms", CURRENT_TERMS_VERSION, "Terms of Use");
  assertPriorStep(profile, "privacy_policy", CURRENT_PRIVACY_POLICY_VERSION, "Privacy Policy");
  assertPriorStep(profile, "liability_waiver", CURRENT_LIABILITY_WAIVER_VERSION, "Liability Waiver");
  if (profile.beta_platform_ack_version === CURRENT_PILOT_ACK_VERSION && profile.beta_platform_ack_at) {
    return { ok: true, step: "beta", idempotent: true };
  }
  if (input.body.agreeBeta !== true) {
    throw new AppError("VALIDATION_ERROR", "Acceptance is required to continue.", undefined, 422);
  }

  const nowIso = new Date().toISOString();
  await writeAuditAndUpdateProfile({
    userId: input.userId,
    documentType: "beta_pilot_acknowledgment",
    version: CURRENT_PILOT_ACK_VERSION,
    profile,
    profileUpdates: {
      beta_platform_ack_at: nowIso,
      beta_platform_ack_version: CURRENT_PILOT_ACK_VERSION,
      beta_platform_ack_accept_ip: input.ip,
      beta_platform_ack_accept_user_agent: input.userAgent,
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return { ok: true, step: "beta" };
}

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

export async function processConsentStep(input: ConsentStepInput): Promise<ConsentStepResult> {
  switch (input.step) {
    case "terms": return processTermsStep(input);
    case "privacy": return processPrivacyStep(input);
    case "waiver": return processWaiverStep(input);
    case "beta": return processBetaStep(input);
    default:
      throw new AppError("VALIDATION_ERROR", "Invalid consent step.", undefined, 422);
  }
}
