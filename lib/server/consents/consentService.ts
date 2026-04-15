/**
 * Domain 1.4 — Consent service.
 * Central orchestration for the Consent sub-domain.
 * Every mutating function calls can() before executing. SOC 2 gate: every
 * mutation emits an audit event.
 *
 * Data class: A — Restricted.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";
import { logEvent } from "@/lib/server/audit/logEvent";
import { emitSignal } from "@/lib/server/trustSignal/signalEmitter";
import {
  getConsentGrantById,
  listConsentGrantsByApplicant,
  insertConsentGrantRecord,
  insertConsentScopeRecord,
  revokeConsentGrantRecord,
} from "./consentRepository";
import {
  serializeForApplicant,
  serializeForProvider,
} from "./consentSerializer";
import type {
  CreateConsentGrantInput,
  RevokeConsentGrantInput,
  ConsentApplicantView,
  ConsentProviderView,
} from "./consentTypes";

// ---------------------------------------------------------------------------
// createConsentGrant
// ---------------------------------------------------------------------------

export async function createConsentGrant(
  actor: PolicyActor,
  input: CreateConsentGrantInput,
  supabase: SupabaseClient,
): Promise<ConsentApplicantView> {
  const resource = {
    type: "consent" as const,
    id: null,
    ownerId: input.applicant_id,
    tenantId: null,
  };

  const decision = await can("consent:create", actor, resource);
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Consent creation denied.", 403);
  }

  const grant = await insertConsentGrantRecord(supabase, input);
  const scope = await insertConsentScopeRecord(supabase, grant.id, input.scope);

  logEvent({
    ctx: null,
    action: "consent.grant_created",
    resourceType: "consent",
    resourceId: grant.id,
    organizationId: null,
    metadata: {
      applicant_id: grant.applicant_id,
      granted_to_type: grant.granted_to_type,
      granted_to_id: grant.granted_to_id,
      purpose_code: grant.purpose_code,
      linked_object_id: scope.linked_object_id,
    },
  }).catch(() => {});

  if (actor.tenantId) {
    emitSignal(
      {
        orgId: actor.tenantId,
        signalType: "consent_grant_rate",
        value: 1,
        actorUserId: actor.userId,
        actorAccountType: actor.accountType,
        idempotencyKey: `${actor.tenantId}:consent_grant_rate:${grant.id}`,
      },
      supabase,
    ).catch(() => {});
    // Canonical lifecycle alias (Master System Document).
    emitSignal(
      {
        orgId: actor.tenantId,
        signalType: "consent_grant_creation",
        value: 0,
        actorUserId: actor.userId,
        actorAccountType: actor.accountType,
        idempotencyKey: `${actor.tenantId}:consent_grant_creation:${grant.id}`,
        metadata: { consent_grant_id: grant.id, purpose_code: grant.purpose_code },
      },
      supabase,
    ).catch(() => {});
  }

  return serializeForApplicant(grant, scope);
}

// ---------------------------------------------------------------------------
// getConsentGrant
// ---------------------------------------------------------------------------

export async function getConsentGrant(
  actor: PolicyActor,
  grantId: string,
  supabase: SupabaseClient,
): Promise<ConsentApplicantView | ConsentProviderView> {
  const grant = await getConsentGrantById(supabase, grantId);
  if (!grant) throw new AppError("NOT_FOUND", "Consent grant not found.", 404);

  const resource = {
    type: "consent" as const,
    id: grantId,
    ownerId: grant.applicant_id,
    tenantId: null,
  };

  const decision = await can("consent:view", actor, resource);
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Consent view denied.", 403);
  }

  if (actor.accountType === "applicant") {
    return serializeForApplicant(grant);
  }
  return serializeForProvider(grant);
}

// ---------------------------------------------------------------------------
// listConsentGrants
// ---------------------------------------------------------------------------

export async function listConsentGrants(
  actor: PolicyActor,
  applicantId: string,
  supabase: SupabaseClient,
): Promise<ConsentApplicantView[]> {
  const grants = await listConsentGrantsByApplicant(supabase, applicantId);
  return grants.map((g) => serializeForApplicant(g));
}

// ---------------------------------------------------------------------------
// revokeConsentGrant
// ---------------------------------------------------------------------------

export async function revokeConsentGrant(
  actor: PolicyActor,
  grantId: string,
  input: RevokeConsentGrantInput,
  supabase: SupabaseClient,
): Promise<{ data: { revoked: true }; error: null }> {
  const grant = await getConsentGrantById(supabase, grantId);
  if (!grant) throw new AppError("NOT_FOUND", "Consent grant not found.", 404);

  const resource = {
    type: "consent" as const,
    id: grantId,
    ownerId: grant.applicant_id,
    tenantId: null,
  };

  const decision = await can("consent:revoke", actor, resource);
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Consent revocation denied.", 403);
  }

  await revokeConsentGrantRecord(supabase, grantId, actor.userId, input.reason);

  logEvent({
    ctx: null,
    action: "consent.grant_revoked",
    resourceType: "consent",
    resourceId: grantId,
    metadata: {
      applicant_id: grant.applicant_id,
      revoked_by: actor.userId,
      reason: input.reason ?? null,
    },
  }).catch(() => {});

  if (actor.tenantId) {
    emitSignal(
      {
        orgId: actor.tenantId,
        signalType: "consent_revocation_rate",
        value: 1,
        actorUserId: actor.userId,
        actorAccountType: actor.accountType,
        idempotencyKey: `${actor.tenantId}:consent_revocation_rate:${grantId}`,
      },
      supabase,
    ).catch(() => {});
    // Canonical lifecycle alias (Master System Document).
    emitSignal(
      {
        orgId: actor.tenantId,
        signalType: "consent.revoked",
        value: 0,
        actorUserId: actor.userId,
        actorAccountType: actor.accountType,
        idempotencyKey: `${actor.tenantId}:consent.revoked:${grantId}`,
        metadata: { consent_grant_id: grantId },
      },
      supabase,
    ).catch(() => {});
  }

  return { data: { revoked: true }, error: null };
}

// ---------------------------------------------------------------------------
// requestConsent (provider-initiated — notifies applicant to create grant)
// ---------------------------------------------------------------------------

export async function requestConsent(
  actor: PolicyActor,
  requestInput: { applicantId: string; linkedObjectId: string; purposeCode: string },
  supabase: SupabaseClient,
): Promise<{ data: { requested: true }; error: null }> {
  const resource = {
    type: "consent" as const,
    id: null,
    ownerId: requestInput.applicantId,
    tenantId: null,
  };

  const decision = await can("consent:request", actor, resource);
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Consent request denied.", 403);
  }

  // Emit timer-start signal — applicant response closes the loop
  if (actor.tenantId) {
    emitSignal(
      {
        orgId: actor.tenantId,
        signalType: "consent_request_response_time",
        value: 0,
        actorUserId: actor.userId,
        actorAccountType: actor.accountType,
        idempotencyKey: `${actor.tenantId}:consent_request_response_time:${requestInput.linkedObjectId}:${Date.now()}`,
        metadata: {
          linked_object_id: requestInput.linkedObjectId,
          purpose_code: requestInput.purposeCode,
        },
      },
      supabase,
    ).catch(() => {});
    // Canonical lifecycle alias (Master System Document).
    emitSignal(
      {
        orgId: actor.tenantId,
        signalType: "consent.requested",
        value: 0,
        actorUserId: actor.userId,
        actorAccountType: actor.accountType,
        idempotencyKey: `${actor.tenantId}:consent.requested:${requestInput.linkedObjectId}:${Date.now()}`,
        metadata: {
          linked_object_id: requestInput.linkedObjectId,
          purpose_code: requestInput.purposeCode,
        },
      },
      supabase,
    ).catch(() => {});
  }

  return { data: { requested: true }, error: null };
}
