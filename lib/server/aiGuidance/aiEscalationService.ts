/**
 * Domain 7.3 — Escalation service.
 *
 * SAFETY CRITICAL — this runs BEFORE every other response path.
 * `detectEscalationNeeds()` checks user input for distress patterns.
 * If triggered, the session moves to "escalated" and crisis resources
 * are returned immediately — no model call is made.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  AIEscalationDecision,
  CrisisResource,
  EscalationType,
} from "./aiGuidanceTypes";
import { DISTRESS_PATTERNS } from "./aiGuidanceTypes";
import { updateSessionStatus, insertLog } from "./aiGuidanceRepository";

/**
 * Checks user message content for distress/crisis patterns.
 * Returns the escalation type if detected, null otherwise.
 *
 * This MUST run before any model API call.
 */
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

/**
 * Returns the canonical crisis resources. Always includes the crisis strip
 * resources from CODING_CONTEXT.md Rule 10.
 */
export function resolveEscalationPath(_escalationType: EscalationType): CrisisResource[] {
  return [
    { name: "National Domestic Violence Hotline", contact: "1-800-799-7233", available: "24/7" },
    { name: "Crisis Text Line", contact: "Text HOME to 741741", available: "24/7" },
    { name: "RAINN", contact: "1-800-656-4673", available: "24/7" },
    { name: "Local emergency", contact: "911", available: "24/7" },
  ];
}

/**
 * Escalates an AI guidance session. Transitions to "escalated" status,
 * logs the event, and returns the escalation decision with crisis resources.
 */
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
