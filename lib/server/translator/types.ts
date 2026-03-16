/**
 * Phase 9: Context-aware "Explain this" translator – request and context types.
 */

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

export const DEFAULT_DISCLAIMER =
  "This is general information, not legal advice.";

export const MAX_EXPLANATION_LENGTH = 600;
