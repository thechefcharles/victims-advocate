/**
 * Phase 4: Policy document and consent types.
 */

export type PolicyDocType =
  | "terms_of_use"
  | "privacy_policy"
  | "ai_disclaimer"
  | "non_legal_advice";

export type PolicyAppliesToRole = "victim" | "advocate" | "admin" | null;

export type PolicyDocumentRow = {
  id: string;
  created_at: string;
  updated_at: string;
  doc_type: PolicyDocType;
  version: string;
  title: string;
  content: string;
  is_active: boolean;
  applies_to_role: PolicyAppliesToRole;
  workflow_key: string | null;
  created_by: string | null;
  metadata: Record<string, unknown>;
};

export type PolicyAcceptanceRow = {
  id: string;
  user_id: string;
  policy_document_id: string;
  doc_type: string;
  version: string;
  accepted_at: string;
  role_at_acceptance: string | null;
  workflow_key: string | null;
};
