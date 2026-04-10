/**
 * Domain 7.1 — Policy acceptance service.
 *
 * Runtime enforcement: `requirePolicyAcceptance()` throws if the user
 * hasn't accepted the current active version of a required policy type.
 *
 * Acceptance records are immutable (INSERT ONLY, DB trigger enforced).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type { PolicyAcceptanceV2 } from "./governanceTypes";
import {
  getActivePolicyDocument,
  getPolicyAcceptance,
  insertPolicyAcceptance,
} from "./governanceRepository";
import { logAuditEvent } from "./auditService";

/**
 * Accept the current active version of a policy type. Creates an immutable
 * acceptance record. Idempotent — re-accepting the same version is a no-op.
 */
export async function acceptPolicy(params: {
  userId: string;
  policyType: string;
  metadata?: Record<string, unknown>;
  supabase?: SupabaseClient;
}): Promise<PolicyAcceptanceV2> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const active = await getActivePolicyDocument(params.policyType, supabase);
  if (!active) {
    throw new AppError(
      "NOT_FOUND",
      `No active policy found for type '${params.policyType}'.`,
      undefined,
      404,
    );
  }

  // Check for existing acceptance (idempotent).
  const existing = await getPolicyAcceptance(params.userId, active.id, supabase);
  if (existing) return existing;

  const acceptance = await insertPolicyAcceptance(
    {
      userId: params.userId,
      policyDocumentId: active.id,
      policyType: active.policyType,
      version: active.version,
      metadata: params.metadata ?? {},
    },
    supabase,
  );

  void logAuditEvent({
    actorId: params.userId,
    action: "policy_acceptance:create",
    resourceType: "policy_acceptance",
    resourceId: acceptance.id,
    eventCategory: "policy_acceptance",
    metadata: {
      policy_type: active.policyType,
      version: active.version,
      policy_document_id: active.id,
    },
  });

  return acceptance;
}

/**
 * Check whether a user has accepted a specific policy document.
 */
export async function checkPolicyAcceptance(
  userId: string,
  policyDocumentId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<boolean> {
  const acceptance = await getPolicyAcceptance(userId, policyDocumentId, supabase);
  return acceptance !== null;
}

/**
 * Runtime gate: throws if the user hasn't accepted the current active
 * version of the specified policy type. Use at route boundaries.
 */
export async function requirePolicyAcceptance(
  userId: string,
  policyType: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<void> {
  const active = await getActivePolicyDocument(policyType, supabase);
  if (!active) return; // No active policy → nothing to accept.
  const accepted = await checkPolicyAcceptance(userId, active.id, supabase);
  if (!accepted) {
    throw new AppError(
      "CONSENT_REQUIRED",
      `You must accept the current '${policyType}' policy (v${active.version}) to continue.`,
      { policyId: active.id, version: active.version, policyType },
      403,
    );
  }
}
