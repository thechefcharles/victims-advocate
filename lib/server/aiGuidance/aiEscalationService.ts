/**
 * Domain 7.3 — AI escalation service.
 *
 * SAFETY CRITICAL: runs before every AI model call. Gates what happens on the
 * current turn based on three escalation categories (see escalationDetector).
 *
 * Public API:
 *   processMessage(sessionId, messageText, actor)
 *     → detects escalation, persists events, transitions session when needed,
 *       and returns what the guidance layer should do for this turn.
 *
 * Legacy API (kept for backwards compatibility with aiGuidanceService call
 * sites that haven't migrated yet):
 *   detectEscalationNeeds(content)
 *   escalateAIGuidanceSession(params)
 *
 * PRIVACY: messageText is used only to call detectEscalation(). It is never
 * written to any DB row from this module. All logs and events store
 * category + reason_code only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createNotification } from "@/lib/server/notifications/create";
import type { AIEscalationDecision, CrisisResource, EscalationType } from "./aiGuidanceTypes";
import { DISTRESS_PATTERNS } from "./aiGuidanceTypes";
import { updateSessionStatus, insertLog } from "./aiGuidanceRepository";
import {
  detectEscalation,
  type EscalationCategory,
  type EscalationDetection,
} from "./escalationDetector";

// ---------------------------------------------------------------------------
// Actor shape (light — avoids coupling to AuthContext here)
// ---------------------------------------------------------------------------

export interface EscalationActor {
  userId: string;
  accountType: string;
  /** When set, the session has an active case and an advocate can be notified. */
  activeCaseId?: string | null;
  advocateUserId?: string | null;
  organizationId?: string | null;
}

// ---------------------------------------------------------------------------
// Response shape returned to aiGuidanceService
// ---------------------------------------------------------------------------

export type EscalationResponseType = "full" | "soft" | "boundary";

export interface EscalationResponse {
  escalationType: EscalationResponseType;
  category: EscalationCategory;
  reasonCode: string;
  resourcesSurfaced: string[];
  inlineMessage: string | null;
  sessionEscalated: boolean;
  /** True → caller must NOT invoke the AI model this turn. */
  guidanceShouldStop: boolean;
  /** Advocate CTA payload when a case is active and full escalation fired. */
  advocateCta: { firstName: string | null; contact: string | null } | null;
}

// ---------------------------------------------------------------------------
// Counter I/O
// ---------------------------------------------------------------------------

interface CounterRow {
  session_id: string;
  distress_signal_count: number;
  soft_escalation_fired: boolean;
}

async function readDistressCounter(
  sessionId: string,
  supabase: SupabaseClient,
): Promise<CounterRow> {
  const { data } = await supabase
    .from("ai_session_distress_counters")
    .select("session_id, distress_signal_count, soft_escalation_fired")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (data) return data as CounterRow;
  return { session_id: sessionId, distress_signal_count: 0, soft_escalation_fired: false };
}

async function persistDistressCounter(
  sessionId: string,
  count: number,
  softFired: boolean,
  supabase: SupabaseClient,
): Promise<void> {
  await supabase.from("ai_session_distress_counters").upsert(
    {
      session_id: sessionId,
      distress_signal_count: count,
      soft_escalation_fired: softFired,
      last_signal_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );
}

// ---------------------------------------------------------------------------
// processMessage — the canonical entrypoint
// ---------------------------------------------------------------------------

export async function processMessage(
  sessionId: string,
  messageText: string,
  actor: EscalationActor,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<EscalationResponse | null> {
  const counter = await readDistressCounter(sessionId, supabase);

  // Deterministic detection. messageText stays inside this function call
  // and is discarded after the match — NEVER written to any DB row below.
  const detection: EscalationDetection = detectEscalation(
    messageText,
    counter.distress_signal_count,
    counter.soft_escalation_fired,
  );

  if (
    detection.nextDistressCount !== counter.distress_signal_count ||
    detection.flipSoftFired
  ) {
    await persistDistressCounter(
      sessionId,
      detection.nextDistressCount,
      counter.soft_escalation_fired || detection.flipSoftFired,
      supabase,
    );
  }

  if (!detection.triggered) return null;

  const { data: sessionRow } = await supabase
    .from("ai_guidance_sessions")
    .select("id, status, organization_id")
    .eq("id", sessionId)
    .maybeSingle();
  const sessionOrgId =
    (sessionRow as { organization_id?: string | null } | null)?.organization_id ?? null;
  const currentStatus = (sessionRow as { status?: string } | null)?.status ?? "active";

  const escalationType: EscalationResponseType = detection.requiresSessionEscalation
    ? "full"
    : detection.requiresSoftEscalation
      ? "soft"
      : "boundary";

  let sessionEscalated = false;
  let advocateNotified = false;
  const orgIdForEvent = actor.organizationId ?? sessionOrgId;

  if (detection.requiresSessionEscalation && currentStatus === "active") {
    // Safety-critical: session MUST move to escalated. We update directly so
    // a missing workflow entity registration can't block the transition.
    await updateSessionStatus(
      sessionId,
      "escalated",
      { escalationReason: detection.reasonCode ?? undefined },
      supabase,
    );
    sessionEscalated = true;

    if (actor.advocateUserId) {
      await createNotification(
        {
          userId: actor.advocateUserId,
          organizationId: orgIdForEvent,
          caseId: actor.activeCaseId ?? null,
          type: "ai_guidance.escalation",
          title: "An applicant needs immediate support",
          body:
            "The AI guidance session escalated to a human-support state. Please check in when you can.",
          previewSafe: true,
          metadata: { session_id: sessionId, category: detection.category },
        },
        null,
      ).catch(() => {
        /* notifications are best-effort */
      });
      advocateNotified = true;
    }
  }

  await supabase.from("ai_escalation_events").insert({
    session_id: sessionId,
    organization_id: orgIdForEvent,
    category: detection.category,
    reason_code: detection.reasonCode,
    resources_surfaced: detection.resourcesSurfaced,
    advocate_notified: advocateNotified,
    soft_escalation_fired: detection.requiresSoftEscalation,
    session_escalated: sessionEscalated,
  });

  await insertLog(
    {
      sessionId,
      actorId: actor.userId,
      eventType: "escalation_triggered",
      metadata: {
        category: detection.category,
        reason_code: detection.reasonCode,
        session_escalated: sessionEscalated,
      },
    },
    supabase,
  ).catch(() => {});

  return {
    escalationType,
    category: detection.category as EscalationCategory,
    reasonCode: detection.reasonCode ?? "unknown",
    resourcesSurfaced: detection.resourcesSurfaced,
    inlineMessage: detection.inlineMessage,
    sessionEscalated,
    guidanceShouldStop: escalationType === "full" || escalationType === "boundary",
    advocateCta:
      escalationType === "full" && actor.advocateUserId
        ? { firstName: null, contact: null }
        : null,
  };
}

// ---------------------------------------------------------------------------
// Legacy API — kept so existing aiGuidanceService call sites still work.
// Will be removed once that service migrates to processMessage.
// ---------------------------------------------------------------------------

export function detectEscalationNeeds(content: string): EscalationType | null {
  const text = content.toLowerCase();
  for (const pattern of DISTRESS_PATTERNS) {
    if (pattern.test(text)) {
      if (/suicid|kill\s*(my)?self|want\s*to\s*die|self[- ]?harm/i.test(text)) {
        return "self_harm_risk";
      }
      if (/danger|afraid\s*for\s*my\s*life|not\s*safe/i.test(text)) {
        return "crisis_language";
      }
      if (/being\s*(hit|beaten|abused)|hurt(ing)?\s*me/i.test(text)) {
        return "distress_detected";
      }
      return "distress_detected";
    }
  }
  return null;
}

export function resolveEscalationPath(_escalationType: EscalationType): CrisisResource[] {
  return [
    { name: "National Domestic Violence Hotline", contact: "1-800-799-7233", available: "24/7" },
    { name: "Crisis Text Line", contact: "Text HOME to 741741", available: "24/7" },
    { name: "RAINN", contact: "1-800-656-4673", available: "24/7" },
    { name: "Local emergency", contact: "911", available: "24/7" },
  ];
}

export async function escalateAIGuidanceSession(params: {
  sessionId: string;
  actorId: string;
  escalationType: EscalationType;
  supabase?: SupabaseClient;
}): Promise<AIEscalationDecision> {
  const supabase = params.supabase ?? getSupabaseAdmin();

  await updateSessionStatus(
    params.sessionId,
    "escalated",
    { escalationReason: params.escalationType },
    supabase,
  );

  await insertLog(
    {
      sessionId: params.sessionId,
      actorId: params.actorId,
      eventType: "escalation_triggered",
      metadata: { escalation_type: params.escalationType },
    },
    supabase,
  ).catch(() => {});

  return {
    escalationType: params.escalationType,
    reasonCode: params.escalationType,
    recommendedNextStep:
      "Please reach out to one of these support resources. You are not alone.",
    crisisResources: resolveEscalationPath(params.escalationType),
    sessionStatus: "escalated",
  };
}

export { detectEscalation } from "./escalationDetector";
export type { EscalationDetection, EscalationCategory } from "./escalationDetector";
