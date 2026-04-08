/**
 * Domain 2.3 — CVC Form Processing & Alignment Engine: public surface.
 *
 * Import everything from here:
 *   import { generateCvcForm, getActiveCvcFormTemplate } from "@/lib/server/cvcForms"
 *   import type { AdminTemplateView, OutputJobStatusView } from "@/lib/server/cvcForms"
 */

export {
  previewCvcForm,
  generateCvcForm,
  getCvcFormGenerationStatus,
  resolveCanonicalOutputData,
  validateCvcGenerationReadiness,
} from "./cvcOutputService";

export {
  createCvcFormTemplate,
  updateCvcFormTemplate,
  activateCvcFormTemplate,
  deprecateCvcFormTemplate,
  createCvcFormField,
  createFormAlignmentMapping,
  validateAlignment,
  getCvcFormTemplate,
  listCvcFormTemplatesAdmin,
} from "./cvcFormTemplateService";

export { renderCvcPdf, translateNarrativeFieldsForOutput } from "./pdfRenderService";

export {
  validateFormAlignmentCompleteness,
} from "./configValidation";

export {
  getActiveCvcFormTemplate,
  getCvcFormTemplateById,
  listCvcFormTemplates,
} from "./cvcFormRepository";

export {
  serializeForAdmin,
  serializeForRuntime,
  serializeOutputJobStatus,
} from "./cvcFormSerializer";

export type {
  CvcFormTemplateRecord,
  CvcFormFieldRecord,
  FormAlignmentMappingRecord,
  OutputGenerationJobRecord,
  CvcFormTemplateStatus,
  OutputGenerationJobStatus,
  CreateCvcFormTemplateInput,
  UpdateCvcFormTemplateInput,
  CreateCvcFormFieldInput,
  CreateFormAlignmentMappingInput,
  OutputPayload,
  AdminTemplateView,
  RuntimePreviewView,
  OutputJobStatusView,
  CvcFormFieldType,
  FormAlignmentMappingPurpose,
} from "./cvcFormTypes";
