/**
 * Domain 7.3 — AI Guidance Chatbot — canonical types.
 *
 * Data class: A — Restricted. Trauma-informed, safety-critical.
 *
 * The single most important function: resolveAIGuidanceContext()
 * — the ONLY path from domain data to the AI model.
 *
 * Hard rules:
 *   1. Safety first — escalation detection runs before EVERY response path
 *   2. Permission-filtered context — model NEVER sees unauthorized data
 *   3. Governance — every interaction logged, no raw content in logs
 *   4. Boundaries — AI explains, it doesn't decide; guides, doesn't guarantee
 *   5. human_review_required = true ALWAYS for copilot drafts in v1
 */

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export const AI_GUIDANCE_SESSION_STATUSES = [
  "active",
  "escalated",
  "closed",
] as const;
export type AIGuidanceSessionStatus =
  (typeof AI_GUIDANCE_SESSION_STATUSES)[number];

export const AI_GUIDANCE_SURFACE_TYPES = [
  "applicant_intake",
  "applicant_case",
  "applicant_general",
  "provider_copilot",
  "admin_inspection",
] as const;
export type AIGuidanceSurfaceType =
  (typeof AI_GUIDANCE_SURFACE_TYPES)[number];

export interface AIGuidanceSession {
  id: string;
  actorUserId: string;
  actorAccountType: string;
  surfaceType: AIGuidanceSurfaceType;
  linkedObjectType: string | null;
  linkedObjectId: string | null;
  status: AIGuidanceSessionStatus;
  language: string;
  escalationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

export const AI_GUIDANCE_ACTOR_TYPES = ["user", "assistant", "system"] as const;
export type AIGuidanceActorType = (typeof AI_GUIDANCE_ACTOR_TYPES)[number];

export const AI_GUIDANCE_CONTENT_TYPES = [
  "text",
  "checklist",
  "explanation",
  "escalation",
  "draft",
] as const;
export type AIGuidanceContentType =
  (typeof AI_GUIDANCE_CONTENT_TYPES)[number];

export interface AIGuidanceMessage {
  id: string;
  sessionId: string;
  actorType: AIGuidanceActorType;
  content: string;
  contentType: AIGuidanceContentType;
  disclaimerFlags: string[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Log event (governance — no raw content)
// ---------------------------------------------------------------------------

export const AI_GUIDANCE_LOG_EVENT_TYPES = [
  "session_created",
  "message_sent",
  "escalation_triggered",
  "draft_generated",
  "draft_reviewed",
  "explain_requested",
  "checklist_generated",
  "session_closed",
] as const;
export type AIGuidanceLogEventType =
  (typeof AI_GUIDANCE_LOG_EVENT_TYPES)[number];

export interface AIGuidanceLog {
  id: string;
  sessionId: string;
  actorId: string;
  eventType: AIGuidanceLogEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Copilot draft
// ---------------------------------------------------------------------------

export const COPILOT_DRAFT_STATUSES = [
  "draft_generated",
  "reviewed",
  "discarded",
  "applied",
] as const;
export type AdvocateCopilotDraftStatus =
  (typeof COPILOT_DRAFT_STATUSES)[number];

export const COPILOT_DRAFT_TYPES = [
  "case_note",
  "referral_summary",
  "status_update",
  "compliance_response",
] as const;
export type CopilotDraftType = (typeof COPILOT_DRAFT_TYPES)[number];

export interface AdvocateCopilotDraft {
  id: string;
  sessionId: string;
  organizationId: string;
  generatedByUserId: string;
  draftType: CopilotDraftType;
  draftContent: string;
  humanReviewRequired: boolean;
  status: AdvocateCopilotDraftStatus;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// AI Guidance Context — permission-filtered data bundle
// ---------------------------------------------------------------------------

export interface AIGuidanceContext {
  actorUserId: string;
  surfaceType: AIGuidanceSurfaceType;
  language: string;
  /** Safe summary only — never raw intake responses. */
  intakeStatus: { step: string; completionPct: number } | null;
  /** Safe summary only — never raw case data. */
  caseStatus: { status: string; nextStep: string | null } | null;
  /** Workflow context for the linked object. */
  workflowSummary: string | null;
}

// ---------------------------------------------------------------------------
// Constraint profile — mode rules per surface
// ---------------------------------------------------------------------------

export interface AIConstraintProfile {
  surfaceType: AIGuidanceSurfaceType;
  legalAdviceAllowed: false;
  escalationRequired: boolean;
  draftingAllowed: boolean;
  allowedContentTypes: AIGuidanceContentType[];
  toneRules: string[];
  disclaimers: string[];
}

// ---------------------------------------------------------------------------
// Escalation
// ---------------------------------------------------------------------------

export const ESCALATION_TYPES = [
  "distress_detected",
  "crisis_language",
  "self_harm_risk",
  "explicit_request",
] as const;
export type EscalationType = (typeof ESCALATION_TYPES)[number];

export interface AIEscalationDecision {
  escalationType: EscalationType;
  reasonCode: string;
  recommendedNextStep: string;
  crisisResources: CrisisResource[];
  sessionStatus: "escalated";
}

export interface CrisisResource {
  name: string;
  contact: string;
  available: string;
}

// ---------------------------------------------------------------------------
// Distress detection patterns
// ---------------------------------------------------------------------------

export const DISTRESS_PATTERNS = [
  /\b(kill\s*(my)?self|suicide|suicidal|end\s*(my|it\s*all))\b/i,
  /\b(want\s*to\s*die|don'?t\s*want\s*to\s*live|no\s*reason\s*to\s*live)\b/i,
  /\b(hurt(ing)?\s*(my)?self|self[- ]?harm|cutting)\b/i,
  /\b(being\s*(hit|beaten|abused)|he('?s| is)\s*(hitting|beating|hurting)\s*me)\b/i,
  /\b(i('?m| am)\s*in\s*danger|not\s*safe|afraid\s*for\s*my\s*life)\b/i,
  /\b(help\s*me\s*(please|now)|someone\s*is\s*(going\s*to|gonna)\s*(hurt|kill))\b/i,
];
