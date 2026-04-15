/**
 * Shared client-side types for the intake-v2 renderer.
 *
 * Mirrors the server response shape from getTemplateFields. Kept in a
 * separate module so client components can import it without pulling in
 * server-only deps.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "checkbox"
  | "date"
  | "currency"
  | "signature"
  | "repeating_rows";

export interface ConditionalRule {
  field_key: string;
  operator: "eq" | "neq" | "in" | "not_in";
  value: unknown;
}

export interface RenderField {
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  helpText: string | null;
  placeholder: string | null;
  inputOptions: Array<{ value: string; label: string }> | null;
  conditionalOn: ConditionalRule | null;
  validationRules: Record<string, unknown> | null;
}

export interface RenderSection {
  sectionKey: string;
  sectionTitle: string;
  fields: RenderField[];
}

export interface TemplateFields {
  templateId: string;
  stateCode: string;
  sections: RenderSection[];
}

export interface IntakeV2SessionView {
  sessionId: string;
  templateId: string | null;
  stateCode: string;
  filerType: string;
  answers: Record<string, unknown>;
  completedSections: string[];
  currentSection: string | null;
  status: "draft" | "submitted" | "abandoned";
  submittedAt: string | null;
  answersLocale: "en" | "es";
  signedAt: string | null;
  caseId: string | null;
}
