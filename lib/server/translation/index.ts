/**
 * Domain 2.4: Translation / i18n — public surface.
 *
 * Import everything from here:
 *   import { explainText, getLocalePreference } from "@/lib/server/translation"
 *   import type { LocaleCode, ExplanationResultView } from "@/lib/server/translation"
 */

export { explainText, listExplanationRequestsAdmin } from "./explanationService";

export {
  getLocalePreference,
  updateLocalePreference,
} from "./localePreferenceService";

export {
  resolveActiveTranslationMappingSet,
  getActiveMappingSetForAdmin,
  listTranslationMappingSets,
  createTranslationMappingSet,
  publishTranslationMappingSet,
  addTranslationMapping,
  resolveCanonicalValue,
  normalizeStructuredPayload,
} from "./translationMappingService";

export { resolveLocalizedContent } from "./i18nService";

export { hashExplanationSourceText } from "./hashUtils";

export {
  applyOutputGuardrails,
  EXPLANATION_BLACKLIST,
  SAFE_FALLBACK_MESSAGE,
} from "./outputGuardrails";

export {
  serializeLocalePreference,
  serializeExplanationResult,
  serializeAdminExplanationLog,
  serializeAdminMappingSet,
} from "./translationSerializer";

export {
  buildExplainSystemPrompt,
  buildExplainUserPrompt,
  buildKnowledgeContextBlock,
  BEHAVIOR_RULES,
} from "./buildPrompt";

export {
  DEFAULT_DISCLAIMER,
  MAX_EXPLANATION_LENGTH,
} from "./translationTypes";

export type {
  LocaleCode,
  TranslationMappingSetStatus,
  ExplanationRequestStatus,
  ExplainRequest,
  ExplainResponse,
  ExplainContextType,
  ExplainWorkflowKey,
  TranslationMappingSetRecordV2,
  TranslationMappingRecord,
  CreateTranslationMappingSetInput,
  CreateTranslationMappingInput,
  LocalePreferenceRecord,
  LocalePreferenceView,
  ExplanationRequestRecord,
  ExplanationResultView,
  AdminExplanationLogView,
  AdminMappingSetView,
} from "./translationTypes";
