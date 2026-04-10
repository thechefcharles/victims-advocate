/**
 * Domain 7.3 — AI explanation service.
 *
 * Provides explain/checklist/status-summary capabilities.
 * All outputs include disclaimers. No raw data exposed.
 */

import type { AIGuidanceContext, AIConstraintProfile } from "./aiGuidanceTypes";

/**
 * Explains a workflow concept in plain language with disclaimer.
 */
export function explainWorkflowText(params: {
  topic: string;
  context: AIGuidanceContext;
  constraints: AIConstraintProfile;
}): { explanation: string; disclaimer: string } {
  return {
    explanation: `Here's how "${params.topic}" works in your situation. ${
      params.context.workflowSummary ?? "This is a step in the process to get you the help you need."
    }`,
    disclaimer: params.constraints.disclaimers[0] ?? "This is general guidance, not legal advice.",
  };
}

/**
 * Generates a checklist from workflow state. Derived from the context
 * provided by resolveAIGuidanceContext — never from raw DB queries.
 */
export function generateWorkflowChecklist(params: {
  context: AIGuidanceContext;
}): { items: Array<{ label: string; completed: boolean }>; disclaimer: string } {
  const items = [];
  if (params.context.intakeStatus) {
    items.push({
      label: `Complete intake (currently ${params.context.intakeStatus.completionPct}%)`,
      completed: params.context.intakeStatus.completionPct >= 100,
    });
  }
  if (params.context.caseStatus) {
    items.push({
      label: `Case status: ${params.context.caseStatus.status}`,
      completed: false,
    });
    if (params.context.caseStatus.nextStep) {
      items.push({
        label: params.context.caseStatus.nextStep,
        completed: false,
      });
    }
  }
  if (items.length === 0) {
    items.push({ label: "Get started by telling us about your situation", completed: false });
  }
  return {
    items,
    disclaimer: "This is general guidance, not legal advice.",
  };
}

/**
 * Summarizes workflow status in plain language.
 */
export function summarizeWorkflowStatus(params: {
  context: AIGuidanceContext;
}): { summary: string; disclaimer: string } {
  const parts: string[] = [];
  if (params.context.intakeStatus) {
    parts.push(`Your intake is ${params.context.intakeStatus.completionPct}% complete.`);
  }
  if (params.context.caseStatus) {
    parts.push(`Your case is currently "${params.context.caseStatus.status}".`);
    if (params.context.caseStatus.nextStep) {
      parts.push(`Next step: ${params.context.caseStatus.nextStep}`);
    }
  }
  return {
    summary: parts.length > 0 ? parts.join(" ") : "We're here to help when you're ready.",
    disclaimer: "This is general guidance, not legal advice.",
  };
}
