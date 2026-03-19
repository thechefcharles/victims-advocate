/**
 * Phase 4: Active policy lookup and acceptance checks.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import type { PolicyDocumentRow, PolicyDocType } from "./types";

export type GetActivePolicyParams = {
  docType: PolicyDocType;
  /** Organization accounts use the same policy rows as advocates unless org-specific rows exist. */
  role?: "victim" | "advocate" | "admin" | "organization" | null;
  workflowKey?: string | null;
};

function policyLookupRole(
  role: GetActivePolicyParams["role"]
): "victim" | "advocate" | "admin" | null {
  if (role === "organization") return "advocate";
  if (role === "victim" || role === "advocate" || role === "admin") return role;
  return null;
}

export async function getActivePolicyDocument(
  params: GetActivePolicyParams
): Promise<PolicyDocumentRow | null> {
  const { docType, role = null, workflowKey = null } = params;
  const lookupRole = policyLookupRole(role);
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("policy_documents")
    .select("*")
    .eq("doc_type", docType)
    .eq("is_active", true);

  if (lookupRole != null) {
    query = query.or(`applies_to_role.eq.${lookupRole},applies_to_role.is.null`);
  } else {
    query = query.is("applies_to_role", null);
  }

  if (workflowKey != null && workflowKey !== "") {
    query = query.or(`workflow_key.eq.${workflowKey},workflow_key.is.null`);
  } else {
    query = query.is("workflow_key", null);
  }

  const { data, error } = await query
    .order("applies_to_role", { ascending: false, nullsFirst: false })
    .order("workflow_key", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as PolicyDocumentRow;
}

export type RequiredPolicySpec = {
  docType: PolicyDocType;
  workflowKey?: string | null;
};

/** For signup/general: terms + privacy. For AI: ai_disclaimer. For compensation: non_legal_advice (workflow_key). */
export function getRequiredPoliciesForUser(params: {
  role: "victim" | "advocate" | "organization";
  workflowKey?: string | null;
}): RequiredPolicySpec[] {
  const { workflowKey } = params;
  const base: RequiredPolicySpec[] = [
    { docType: "terms_of_use" },
    { docType: "privacy_policy" },
  ];
  if (workflowKey === "ai_chat" || workflowKey === "translator") {
    base.push({ docType: "ai_disclaimer", workflowKey: workflowKey ?? undefined });
  } else if (workflowKey === "compensation_intake") {
    base.push({ docType: "non_legal_advice", workflowKey: "compensation_intake" });
  }
  return base;
}

export async function hasAcceptedActivePolicy(params: {
  userId: string;
  docType: PolicyDocType;
  role?: string | null;
  workflowKey?: string | null;
}): Promise<boolean> {
  const { userId, docType, role, workflowKey } = params;
  const policy = await getActivePolicyDocument({
    docType,
    role: role as GetActivePolicyParams["role"],
    workflowKey,
  });
  if (!policy) return true;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("policy_acceptances")
    .select("id")
    .eq("user_id", userId)
    .eq("policy_document_id", policy.id)
    .maybeSingle();

  return !!data;
}

export async function getMissingAcceptances(params: {
  userId: string;
  role: "victim" | "advocate" | "organization";
  workflowKey?: string | null;
}): Promise<PolicyDocumentRow[]> {
  const { userId, role, workflowKey } = params;
  const required = getRequiredPoliciesForUser({ role, workflowKey });
  const missing: PolicyDocumentRow[] = [];

  for (const spec of required) {
    const policy = await getActivePolicyDocument({
      docType: spec.docType,
      role,
      workflowKey: spec.workflowKey ?? null,
    });
    if (!policy) continue;

    const accepted = await hasAcceptedActivePolicy({
      userId,
      docType: spec.docType,
      role,
      workflowKey: spec.workflowKey ?? null,
    });
    if (!accepted) missing.push(policy);
  }

  return missing;
}
