/**
 * Domain 7.3 — AI Ops mode registry.
 *
 * Declarative per-mode config: model tier, allowed tools, token ceiling,
 * prompt/disclaimer keys, permitted context scopes, forbidden response
 * patterns. The orchestrator reads this for every call.
 */

export type ModelTier = "light" | "heavy" | "template";

export interface AIModeConfig {
  modelTier: ModelTier;
  allowedTools: readonly string[];
  maxTokens: number;
  systemPromptKey: string;
  disclaimerKey: string | null;
  allowedContextScopes: readonly string[];
  /** Regex-free substring patterns rejected by Layer 1. Case-insensitive. */
  forbiddenResponsePatterns: readonly string[];
}

export const AI_MODES = {
  applicant_guidance: {
    modelTier: "heavy",
    allowedTools: [
      "getEligibilityInfo",
      "getApplicationStatus",
      "getRequiredDocuments",
      "getCrisisResources",
    ],
    maxTokens: 1024,
    systemPromptKey: "applicant_guidance_v1",
    disclaimerKey: "applicant_disclaimer_v1",
    allowedContextScopes: [
      "intake_session",
      "case_summary",
      "applicant_profile",
      "eligibility_rules",
    ],
    forbiddenResponsePatterns: [
      "you will win",
      "you will be approved",
      "legally you",
      "my legal opinion",
      "i guarantee",
      "i promise you",
    ],
  },
  intake_explanation: {
    modelTier: "light",
    allowedTools: ["getFieldDefinition", "getFieldExamples"],
    maxTokens: 512,
    systemPromptKey: "intake_explanation_v1",
    disclaimerKey: null,
    allowedContextScopes: ["field_definition", "field_examples"],
    forbiddenResponsePatterns: ["you will", "guarantee", "promise"],
  },
  provider_copilot: {
    modelTier: "heavy",
    allowedTools: ["getWorkflowSummary", "createDraftNote", "getDocumentList"],
    maxTokens: 2048,
    systemPromptKey: "provider_copilot_v1",
    disclaimerKey: "copilot_disclaimer_v1",
    allowedContextScopes: [
      "case_summary",
      "document_list",
      "workflow_state",
      "applicant_summary_only",
    ],
    forbiddenResponsePatterns: [],
  },
  document_explanation: {
    modelTier: "light",
    allowedTools: ["getDocumentRequirements", "getDocumentExamples"],
    maxTokens: 512,
    systemPromptKey: "document_explanation_v1",
    disclaimerKey: null,
    allowedContextScopes: ["document_requirements"],
    forbiddenResponsePatterns: [],
  },
  admin_evaluation: {
    modelTier: "template",
    allowedTools: ["getSystemMetrics", "getAuditSummary"],
    maxTokens: 2048,
    systemPromptKey: "admin_evaluation_v1",
    disclaimerKey: null,
    allowedContextScopes: ["aggregate_metrics", "audit_summary"],
    forbiddenResponsePatterns: [],
  },
} as const satisfies Record<string, AIModeConfig>;

export type AIModeKey = keyof typeof AI_MODES;

export function getModeConfig(mode: AIModeKey): AIModeConfig {
  return AI_MODES[mode];
}

export function allModes(): AIModeKey[] {
  return Object.keys(AI_MODES) as AIModeKey[];
}

/** Model ids per tier. Orchestrator reads these; swapping versions is a one-line change. */
export const MODEL_ROUTING: Record<ModelTier, string> = {
  light: "claude-haiku-4-5",
  heavy: "claude-sonnet-4-6",
  template: "claude-sonnet-4-6",
};
