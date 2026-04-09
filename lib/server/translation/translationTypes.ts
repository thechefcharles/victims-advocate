/**
 * Domain 2.4: Translation / i18n — TypeScript types.
 *
 * Absorbs the previous lib/server/translator/types.ts plus the new
 * mapping-set, locale-preference, and explanation-request types.
 *
 * Data class:
 *   translation_mapping_sets_v2 / translation_mappings / locale_preferences → Class C
 *   explanation_requests → Class B
 *
 * The architect's hard rule: ExplanationRequestRecord MUST NOT contain a
 * `source_text` field. Only `source_text_hash` and `source_text_length`.
 */

import type {
  LocaleCode,
  TranslationMappingSetStatus,
  ExplanationRequestStatus,
} from "@/lib/registry";

// ---------------------------------------------------------------------------
// Re-exports from registry for module-internal convenience
// ---------------------------------------------------------------------------

export type { LocaleCode, TranslationMappingSetStatus, ExplanationRequestStatus };

// ---------------------------------------------------------------------------
// Existing Phase 9/10 types — preserved verbatim
// ---------------------------------------------------------------------------

export type ExplainContextType =
  | "intake_question"
  | "intake_help"
  | "policy_text"
  | "eligibility_guidance"
  | "form_label"
  | "general";

export type ExplainWorkflowKey =
  | "compensation_intake"
  | "translator"
  | "ai_chat"
  | string;

export type ExplainRequest = {
  sourceText: string;
  contextType: ExplainContextType;
  workflowKey: ExplainWorkflowKey;
  fieldKey?: string | null;
  programKey?: string | null;
  stateCode?: string | null;
  userRole?: string | null;
};

export type ExplainResponse = {
  explanation: string;
  disclaimer?: string;
};

/** The default disclaimer appended to any explanation that does not already contain one. */
export const DEFAULT_DISCLAIMER = "This is general information, not legal advice.";

/** Hard cap on explanation output length, enforced after the OpenAI call. */
export const MAX_EXPLANATION_LENGTH = 600;

// ---------------------------------------------------------------------------
// Translation mapping set types (Domain 2.4 new)
// ---------------------------------------------------------------------------

export type TranslationMappingSetRecordV2 = {
  id: string;
  state_workflow_config_id: string | null;
  state_code: "IL" | "IN";
  locale: LocaleCode;
  status: TranslationMappingSetStatus;
  version_number: number;
  display_name: string;
  published_at: string | null;
  deprecated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TranslationMappingTransformType = "exact_match" | "contains" | "regex";

export type TranslationMappingRecord = {
  id: string;
  mapping_set_id: string;
  source_value: string;
  canonical_value: string;
  field_context: string | null;
  locale: LocaleCode;
  transform_type: TranslationMappingTransformType | null;
  created_at: string;
};

export type CreateTranslationMappingSetInput = {
  state_code: "IL" | "IN";
  locale: LocaleCode;
  display_name: string;
  state_workflow_config_id?: string | null;
};

export type CreateTranslationMappingInput = {
  source_value: string;
  canonical_value: string;
  field_context?: string | null;
  locale?: LocaleCode;
  transform_type?: TranslationMappingTransformType | null;
};

// ---------------------------------------------------------------------------
// Locale preference types
// ---------------------------------------------------------------------------

export type LocalePreferenceRecord = {
  id: string;
  user_id: string;
  locale: LocaleCode;
  updated_at: string;
};

export type LocalePreferenceView = {
  locale: LocaleCode;
};

// ---------------------------------------------------------------------------
// Explanation request types
// ---------------------------------------------------------------------------

/**
 * Raw DB row for public.explanation_requests.
 *
 * HARD RULE: there is no `source_text` field. The architect's compliance
 * requirement is hash-only persistence. Adding a raw text field would be a
 * SOC 2 / privacy violation.
 */
export type ExplanationRequestRecord = {
  id: string;
  user_id: string | null;
  workflow_key: string;
  context_type: string;
  field_key: string | null;
  state_code: string | null;
  source_text_hash: string;
  source_text_length: number;
  explanation_text: string | null;
  disclaimer: string | null;
  model: string | null;
  status: ExplanationRequestStatus;
  failure_reason: string | null;
  created_at: string;
  completed_at: string | null;
};

/** Provider-safe view (returned to the caller). Excludes hash + length + model + user_id. */
export type ExplanationResultView = {
  explanation: string;
  disclaimer: string | null;
  status: ExplanationRequestStatus;
};

/** Admin compliance view. Includes hash + metadata, EXCLUDES the explanation_text body. */
export type AdminExplanationLogView = {
  id: string;
  workflow_key: string;
  context_type: string;
  field_key: string | null;
  state_code: string | null;
  source_text_hash: string;
  source_text_length: number;
  status: ExplanationRequestStatus;
  model: string | null;
  failure_reason: string | null;
  created_at: string;
  completed_at: string | null;
};

// ---------------------------------------------------------------------------
// Mapping set serializer view (admin context)
// ---------------------------------------------------------------------------

export type AdminMappingSetView = {
  id: string;
  state_code: "IL" | "IN";
  locale: LocaleCode;
  status: TranslationMappingSetStatus;
  version_number: number;
  display_name: string;
  published_at: string | null;
  deprecated_at: string | null;
  created_by: string | null;
  created_at: string;
  mapping_count: number;
};
