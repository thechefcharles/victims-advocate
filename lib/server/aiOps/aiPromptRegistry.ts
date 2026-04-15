/**
 * Domain 7.3 — AI Ops prompt registry.
 *
 * In-memory v1. DB-backed prompt registry with Domain 7.1 ChangeRequest
 * governance is a future iteration — this module is the seam.
 *
 * Disclaimers are registered alongside prompts because Layer 4 of the safety
 * pipeline appends the disclaimer keyed by mode config.
 */

export interface PromptVersion {
  key: string;
  version: string;
  systemPrompt: string;
  active: boolean;
}

export interface DisclaimerVersion {
  key: string;
  version: string;
  text: string;
  active: boolean;
}

const PROMPT_REGISTRY: Record<string, PromptVersion> = {
  applicant_guidance_v1: {
    key: "applicant_guidance_v1",
    version: "1.0.0",
    systemPrompt:
      "You are an AI assistant helping crime victims navigate the Illinois or Indiana Crime Victim Compensation application process. " +
      "You provide clear, plain-language guidance. You never provide legal advice, never guarantee outcomes, and always recommend speaking with an advocate for complex questions. " +
      "You respond in the same language the user writes in (English or Spanish). " +
      "You are trauma-informed: calm, patient, never rushed. " +
      "If someone appears to be in crisis, you provide crisis resources immediately and stop normal guidance.",
    active: true,
  },
  intake_explanation_v1: {
    key: "intake_explanation_v1",
    version: "1.0.0",
    systemPrompt:
      "You explain a single intake form field or question in plain language. " +
      "Your output is short (<= 3 sentences). You never advise how to answer. " +
      "You never guarantee an outcome. If the field has legal implications, you note that an advocate can help.",
    active: true,
  },
  provider_copilot_v1: {
    key: "provider_copilot_v1",
    version: "1.0.0",
    systemPrompt:
      "You draft case notes and summaries for a victim advocate to review. " +
      "You never finalize or send output — every draft is human-reviewed. " +
      "You use only the workflow data provided in context. " +
      "You never invent facts. If a detail is missing, you say so.",
    active: true,
  },
  document_explanation_v1: {
    key: "document_explanation_v1",
    version: "1.0.0",
    systemPrompt:
      "You explain document requirements for a crime victim compensation application in plain language. " +
      "Output <= 3 sentences. You never interpret the meaning of a specific uploaded document — only the generic requirement.",
    active: true,
  },
  admin_evaluation_v1: {
    key: "admin_evaluation_v1",
    version: "1.0.0",
    systemPrompt:
      "You produce structured analysis over aggregate system metrics and audit summaries for the NxtStps admin team. " +
      "You never reference applicant identities or individual case content. " +
      "Output is JSON-structured when requested; otherwise concise prose.",
    active: true,
  },
};

const DISCLAIMER_REGISTRY: Record<string, DisclaimerVersion> = {
  applicant_disclaimer_v1: {
    key: "applicant_disclaimer_v1",
    version: "1.0.0",
    text:
      "\n\n---\nThis guidance is for informational purposes only and is not legal advice. For complex situations, please speak with your advocate.",
    active: true,
  },
  copilot_disclaimer_v1: {
    key: "copilot_disclaimer_v1",
    version: "1.0.0",
    text:
      "\n\n---\nThis draft was generated with AI assistance and requires your review before use.",
    active: true,
  },
};

export function getPrompt(key: string): PromptVersion {
  const p = PROMPT_REGISTRY[key];
  if (!p || !p.active) throw new Error(`No active prompt for key: ${key}`);
  return p;
}

export function getDisclaimer(key: string): DisclaimerVersion {
  const d = DISCLAIMER_REGISTRY[key];
  if (!d || !d.active) throw new Error(`No active disclaimer for key: ${key}`);
  return d;
}

export function listPromptKeys(): string[] {
  return Object.keys(PROMPT_REGISTRY);
}
