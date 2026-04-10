/**
 * Domain 7.1 — Policy document service.
 *
 * Lifecycle: draft → active → deprecated
 * Only ONE active per policy_type (DB partial unique index enforces).
 * Publishing a draft demotes the prior active row.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type { PolicyDocument } from "./governanceTypes";
import {
  getActivePolicyDocument,
  getPolicyDocumentById,
  insertPolicyDocument,
  listPolicyDocuments,
  setPolicyDocumentStatus,
} from "./governanceRepository";
import { logAuditEvent } from "./auditService";

export async function createPolicyDraft(params: {
  policyType: string;
  version: string;
  title: string;
  content: string;
  createdByUserId: string;
  supabase?: SupabaseClient;
}): Promise<PolicyDocument> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  return insertPolicyDocument(
    {
      policyType: params.policyType,
      version: params.version,
      title: params.title,
      content: params.content,
      status: "draft",
      createdByUserId: params.createdByUserId,
    },
    supabase,
  );
}

export async function publishPolicyDocument(params: {
  id: string;
  actorId: string;
  supabase?: SupabaseClient;
}): Promise<PolicyDocument> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const target = await getPolicyDocumentById(params.id, supabase);
  if (!target) {
    throw new AppError("NOT_FOUND", "Policy document not found.", undefined, 404);
  }
  if (target.status !== "draft") {
    throw new AppError(
      "VALIDATION_ERROR",
      `Cannot publish policy in status '${target.status}'.`,
      undefined,
      422,
    );
  }
  // Demote prior active for this policy_type.
  const prior = await getActivePolicyDocument(target.policyType, supabase);
  if (prior) {
    await setPolicyDocumentStatus(prior.id, "deprecated", supabase);
  }
  const published = await setPolicyDocumentStatus(params.id, "active", supabase);

  void logAuditEvent({
    actorId: params.actorId,
    action: "policy_document:publish",
    resourceType: "policy_document",
    resourceId: params.id,
    eventCategory: "governance_change",
    metadata: {
      policy_type: published.policyType,
      version: published.version,
      prior_active_id: prior?.id ?? null,
    },
  });

  return published;
}

export async function deprecatePolicyDocument(params: {
  id: string;
  actorId: string;
  supabase?: SupabaseClient;
}): Promise<PolicyDocument> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const target = await getPolicyDocumentById(params.id, supabase);
  if (!target) {
    throw new AppError("NOT_FOUND", "Policy document not found.", undefined, 404);
  }
  if (target.status !== "active") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Only active policies can be deprecated.",
      undefined,
      422,
    );
  }
  const deprecated = await setPolicyDocumentStatus(params.id, "deprecated", supabase);

  void logAuditEvent({
    actorId: params.actorId,
    action: "policy_document:deprecate",
    resourceType: "policy_document",
    resourceId: params.id,
    eventCategory: "governance_change",
  });

  return deprecated;
}

export async function listPolicies(
  policyType: string | null,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<PolicyDocument[]> {
  return listPolicyDocuments(policyType, supabase);
}

export { getActivePolicyDocument, getPolicyDocumentById } from "./governanceRepository";
