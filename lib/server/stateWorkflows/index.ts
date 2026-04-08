/**
 * Domain 2.2 — State Workflows: public surface.
 *
 * Import everything from here:
 *   import { resolveActiveStateWorkflowConfig, publishStateWorkflowConfig } from "@/lib/server/stateWorkflows"
 *   import type { RuntimeConfigView, AdminConfigView } from "@/lib/server/stateWorkflows"
 *
 * Do NOT import directly from sub-files in new code.
 */

export {
  getActiveStateWorkflowConfig,
  getStateWorkflowConfigById,
  listStateWorkflowConfigs,
  createStateWorkflowConfig,
  updateStateWorkflowConfig,
  publishStateWorkflowConfig,
  deprecateStateWorkflowConfig,
} from "./stateWorkflowService";

export {
  resolveActiveStateWorkflowConfig,
  resolveActiveIntakeSchema,
  resolveIntakeSchema,
  resolveEligibilityRuleSet,
  resolveDocumentRequirementSet,
  resolveTranslationMappingSet,
  resolveOutputMappingSet,
  resolveFormTemplateSet,
  resolveVersionContextForWorkflow,
} from "./resolvers";

export { validateConfigCompleteness } from "./configValidation";
export {
  invalidateWorkflowDerivedData,
  registerInvalidationHandler,
} from "./invalidation";

export { serializeForRuntime, serializeForAdmin } from "./stateWorkflowSerializer";

export type {
  StateWorkflowConfigRecord,
  StateWorkflowConfigStatus,
  StateWorkflowConfigWithSets,
  IntakeSchemaRecord,
  EligibilityRuleSetRecord,
  DocumentRequirementSetRecord,
  TranslationMappingSetRecord,
  OutputMappingSetRecord,
  FormTemplateSetRecord,
  DisclaimerSetRecord,
  FormFieldMetadata,
  CreateStateWorkflowConfigInput,
  UpdateStateWorkflowConfigInput,
  RuntimeConfigView,
  AdminConfigView,
} from "./stateWorkflowTypes";
