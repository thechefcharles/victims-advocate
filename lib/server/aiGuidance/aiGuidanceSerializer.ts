/**
 * Domain 7.3 — AI Guidance serializers.
 *
 * 4 views + escalation serializer:
 *   serializeSessionForApplicant — safe messages + disclaimers
 *   serializeDraftForProvider    — draft content + human_review_required
 *   serializeEscalation          — calm copy + crisis resources
 *   serializeLogForAdmin         — event metadata, NO raw message content
 */

import type {
  AdvocateCopilotDraft,
  AIEscalationDecision,
  AIGuidanceLog,
  AIGuidanceMessage,
  AIGuidanceSession,
} from "./aiGuidanceTypes";

// ---------------------------------------------------------------------------
// Applicant session view
// ---------------------------------------------------------------------------

export interface ApplicantSessionView {
  sessionId: string;
  status: string;
  language: string;
  messages: ApplicantMessageView[];
}

export interface ApplicantMessageView {
  id: string;
  actorType: string;
  content: string;
  contentType: string;
  disclaimerFlags: string[];
  createdAt: string;
}

export function serializeSessionForApplicant(
  session: AIGuidanceSession,
  messages: AIGuidanceMessage[],
): ApplicantSessionView {
  return {
    sessionId: session.id,
    status: session.status,
    language: session.language,
    messages: messages.map((m) => ({
      id: m.id,
      actorType: m.actorType,
      content: m.content,
      contentType: m.contentType,
      disclaimerFlags: m.disclaimerFlags,
      createdAt: m.createdAt,
    })),
  };
}

// ---------------------------------------------------------------------------
// Provider copilot draft view
// ---------------------------------------------------------------------------

export interface ProviderDraftView {
  id: string;
  draftType: string;
  draftContent: string;
  humanReviewRequired: boolean;
  status: string;
  createdAt: string;
}

export function serializeDraftForProvider(
  draft: AdvocateCopilotDraft,
): ProviderDraftView {
  return {
    id: draft.id,
    draftType: draft.draftType,
    draftContent: draft.draftContent,
    humanReviewRequired: draft.humanReviewRequired,
    status: draft.status,
    createdAt: draft.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Escalation view — calm, supportive
// ---------------------------------------------------------------------------

export interface EscalationView {
  sessionStatus: string;
  message: string;
  crisisResources: Array<{ name: string; contact: string; available: string }>;
}

export function serializeEscalation(
  decision: AIEscalationDecision,
): EscalationView {
  return {
    sessionStatus: decision.sessionStatus,
    message: decision.recommendedNextStep,
    crisisResources: decision.crisisResources,
  };
}

// ---------------------------------------------------------------------------
// Admin log view — NO raw message content
// ---------------------------------------------------------------------------

export interface AdminLogView {
  id: string;
  sessionId: string;
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export function serializeLogForAdmin(log: AIGuidanceLog): AdminLogView {
  return {
    id: log.id,
    sessionId: log.sessionId,
    eventType: log.eventType,
    metadata: log.metadata,
    createdAt: log.createdAt,
  };
}
