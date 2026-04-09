/**
 * Domain 2.4: Translation / i18n — serializers.
 *
 * Three views:
 *   - serializeLocalePreference     — { locale } only
 *   - serializeExplanationResult    — provider-safe view (no hash, no model, no user_id)
 *   - serializeAdminExplanationLog  — admin compliance view (hash + length, NO explanation_text)
 *   - serializeAdminMappingSet      — admin mapping set view with mapping count
 *
 * HARD RULE: serializeExplanationResult MUST NOT include source_text_hash or
 * source_text_length. Those are admin-only.
 *
 * HARD RULE: serializeAdminExplanationLog MUST NOT include explanation_text.
 * Admin compliance view shows what happened, not the content of the response.
 */

import type {
  LocalePreferenceRecord,
  LocalePreferenceView,
  ExplanationRequestRecord,
  ExplanationResultView,
  AdminExplanationLogView,
  TranslationMappingSetRecordV2,
  TranslationMappingRecord,
  AdminMappingSetView,
} from "./translationTypes";

export function serializeLocalePreference(
  pref: LocalePreferenceRecord,
): LocalePreferenceView {
  return { locale: pref.locale };
}

export function serializeExplanationResult(
  request: ExplanationRequestRecord,
): ExplanationResultView {
  return {
    explanation: request.explanation_text ?? "",
    disclaimer: request.disclaimer,
    status: request.status,
  };
}

export function serializeAdminExplanationLog(
  request: ExplanationRequestRecord,
): AdminExplanationLogView {
  return {
    id: request.id,
    workflow_key: request.workflow_key,
    context_type: request.context_type,
    field_key: request.field_key,
    state_code: request.state_code,
    source_text_hash: request.source_text_hash,
    source_text_length: request.source_text_length,
    status: request.status,
    model: request.model,
    failure_reason: request.failure_reason,
    created_at: request.created_at,
    completed_at: request.completed_at,
  };
}

export function serializeAdminMappingSet(
  set: TranslationMappingSetRecordV2,
  mappings: TranslationMappingRecord[],
): AdminMappingSetView {
  return {
    id: set.id,
    state_code: set.state_code,
    locale: set.locale,
    status: set.status,
    version_number: set.version_number,
    display_name: set.display_name,
    published_at: set.published_at,
    deprecated_at: set.deprecated_at,
    created_by: set.created_by,
    created_at: set.created_at,
    mapping_count: mappings.length,
  };
}
