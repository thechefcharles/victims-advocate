/**
 * Phase 9: Centralized prompt builder for "Explain this" translator.
 * Phase 10: Optional knowledge-base grounding.
 */

import type { ExplainRequest } from "./types";
import { MAX_EXPLANATION_LENGTH } from "./types";
import type { KnowledgeEntryRow } from "@/lib/server/knowledge";

const BEHAVIOR_RULES = [
  "Use plain language only. Avoid jargon unless you briefly define it.",
  "Do not give legal advice. Do not say whether the user qualifies or will get benefits.",
  "Do not make eligibility determinations or say 'you will qualify' or 'you definitely should'.",
  "Use a calm, trauma-informed tone. Avoid pressure or urgency.",
  "Do not contradict official program rules or fabricate program specifics.",
  "Do not suggest omitting or falsifying information.",
  "Keep the explanation short. Prefer 'what this usually means' framing where natural.",
  "If the text asks for sensitive information, acknowledge that and explain why it may be asked, without pressuring.",
].join("\n");

function contextNote(req: ExplainRequest): string {
  const parts: string[] = [];
  parts.push(`Context type: ${req.contextType}`);
  parts.push(`Workflow: ${req.workflowKey}`);
  if (req.userRole) parts.push(`User role: ${req.userRole}`);
  if (req.stateCode) parts.push(`State/program context: ${req.stateCode}`);
  if (req.programKey) parts.push(`Program: ${req.programKey}`);
  if (req.fieldKey) parts.push(`Field/section: ${req.fieldKey}`);
  return parts.join(". ");
}

export function buildExplainSystemPrompt(hasKnowledgeContext = false): string {
  const lines = [
    "You are a plain-language explainer for victim compensation and related forms.",
    "Your job is to explain legal or bureaucratic text in simple terms so people can understand what is being asked or stated.",
    "",
    "RULES:",
    BEHAVIOR_RULES,
    "",
    `Keep your response under ${MAX_EXPLANATION_LENGTH} characters.`,
    "Structure if helpful: a short explanation, optionally 'Why you are seeing this' or 'What this usually means', then a one-line disclaimer if relevant.",
    "Do not output anything that could be construed as legal advice or an eligibility conclusion.",
  ];
  if (hasKnowledgeContext) {
    lines.push(
      "",
      "When AUTHORITATIVE CONTEXT from the knowledge base is provided in the user message, base your explanation on it. Do not add specific rules, deadlines, or program details that are not in that context. If the text to explain is not covered by the context, give a short general explanation only."
    );
  }
  return lines.join("\n");
}

/** Phase 10: Build the knowledge-grounding block for the user prompt. */
export function buildKnowledgeContextBlock(entries: KnowledgeEntryRow[]): string {
  if (!entries.length) return "";
  return [
    "AUTHORITATIVE CONTEXT (use this when relevant to the text to explain):",
    "---",
    ...entries.map((e) => `[${e.title}]\n${e.body}`),
    "---",
    "",
  ].join("\n\n");
}

export function buildExplainUserPrompt(req: ExplainRequest): string {
  const source = (req.sourceText ?? "").trim();
  if (!source) return "No text provided.";

  return [
    contextNote(req),
    "",
    "TEXT TO EXPLAIN:",
    "---",
    source,
    "---",
    "",
    "Provide a short, plain-language explanation. End with a single disclaimer line if appropriate: 'This is general information, not legal advice.'",
  ].join("\n");
}
