/**
 * Phase 10: Knowledge base – entry types and structured data shapes.
 */

export type KnowledgeCategory =
  | "eligibility"
  | "documents"
  | "timeline"
  | "rights"
  | "definitions"
  | "faq"
  | "program_overview";

export type KnowledgeStatus = "draft" | "active" | "archived";

export interface KnowledgeEntryRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  entry_key: string;
  title: string;
  body: string;
  category: KnowledgeCategory;
  state_code: string | null;
  program_key: string | null;
  audience_role: string | null;
  workflow_key: string | null;
  version: string;
  status: KnowledgeStatus;
  is_active: boolean;
  effective_at: string | null;
  structured_data: Record<string, unknown>;
  tags: string[] | null;
  source_label: string | null;
  source_url: string | null;
  last_reviewed_at: string | null;
}

/** Structured data keys for routing/completeness (Phase 11/12). */
export interface KnowledgeStructuredData {
  required_documents?: string[];
  deadline_days?: number;
  eligibility_factors?: string[];
  definitions?: Record<string, string>;
  notes?: string[];
  references?: string[];
}
