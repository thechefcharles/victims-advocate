/**
 * Domain 7.3 — AI Guidance service (main orchestration).
 *
 * The critical flow — sendAIGuidanceMessage:
 *   1. ESCALATION CHECK RUNS FIRST — ALWAYS
 *   2. Permission-filter context via resolveAIGuidanceContext
 *   3. Get constraint profile for surface
 *   4. Build prompt bundle
 *   5. Call model server-side (claude-sonnet-4-6)
 *   6. Apply governance guardrails
 *   7. Save message
 *   8. Log (no raw content in logs)
 *
 * resolveAIGuidanceContext() is the ONLY path from domain data to the AI model.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";
import type {
  AIConstraintProfile,
  AIGuidanceContext,
  AIGuidanceMessage,
  AIGuidanceSession,
  AIGuidanceSurfaceType,
} from "./aiGuidanceTypes";
import {
  getSessionById,
  insertLog,
  insertMessage,
  insertSession,
  listMessagesForSession,
} from "./aiGuidanceRepository";
import { detectEscalationNeeds, escalateAIGuidanceSession } from "./aiEscalationService";

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export async function createAIGuidanceSession(params: {
  actor: PolicyActor;
  surfaceType: AIGuidanceSurfaceType;
  linkedObjectType?: string;
  linkedObjectId?: string;
  language?: string;
  supabase?: SupabaseClient;
}): Promise<AIGuidanceSession> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const session = await insertSession(
    {
      actorUserId: params.actor.userId,
      actorAccountType: params.actor.accountType,
      surfaceType: params.surfaceType,
      linkedObjectType: params.linkedObjectType ?? null,
      linkedObjectId: params.linkedObjectId ?? null,
      status: "active",
      language: params.language ?? "en",
    },
    supabase,
  );

  await insertLog(
    {
      sessionId: session.id,
      actorId: params.actor.userId,
      eventType: "session_created",
      metadata: { surface_type: params.surfaceType },
    },
    supabase,
  ).catch(() => {});

  return session;
}

export async function getAIGuidanceSessionById(
  sessionId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<AIGuidanceSession | null> {
  return getSessionById(sessionId, supabase);
}

// ---------------------------------------------------------------------------
// The critical flow — sendAIGuidanceMessage
// ---------------------------------------------------------------------------

export async function sendAIGuidanceMessage(params: {
  actor: PolicyActor;
  sessionId: string;
  content: string;
  supabase?: SupabaseClient;
}): Promise<{
  message: AIGuidanceMessage;
  escalation?: Awaited<ReturnType<typeof escalateAIGuidanceSession>>;
}> {
  const supabase = params.supabase ?? getSupabaseAdmin();

  const session = await getSessionById(params.sessionId, supabase);
  if (!session) throw new AppError("NOT_FOUND", "Session not found.", undefined, 404);
  if (session.status !== "active") {
    throw new AppError("VALIDATION_ERROR", `Session is ${session.status}; cannot send messages.`, undefined, 422);
  }

  // Save user message first.
  await insertMessage(
    {
      sessionId: params.sessionId,
      actorType: "user",
      content: params.content,
      contentType: "text",
      disclaimerFlags: [],
    },
    supabase,
  );

  // 1. ESCALATION CHECK RUNS FIRST — ALWAYS
  const escalationType = detectEscalationNeeds(params.content);
  if (escalationType) {
    const escalation = await escalateAIGuidanceSession({
      sessionId: params.sessionId,
      actorId: params.actor.userId,
      escalationType,
      supabase,
    });
    const escalationMsg = await insertMessage(
      {
        sessionId: params.sessionId,
        actorType: "system",
        content: escalation.recommendedNextStep,
        contentType: "escalation",
        disclaimerFlags: ["crisis_resources_provided"],
      },
      supabase,
    );
    return { message: escalationMsg, escalation };
  }

  // 2. Permission-filter context
  const context = await resolveAIGuidanceContext(params.actor, session, supabase);

  // 3. Constraint profile
  const constraints = resolveAIConstraintProfile(params.actor, session);

  // 4. Build prompt bundle
  const history = await listMessagesForSession(params.sessionId, supabase);
  const promptBundle = buildAIGuidancePromptBundle(context, constraints, history);

  // 5. Call model server-side (placeholder — actual API call deferred)
  const aiContent = await callAIModel(promptBundle);

  // 6. Governance guardrails
  const safeOutput = applyAIGovernanceGuardrails(aiContent, constraints);

  // 7. Save assistant message
  const assistantMsg = await insertMessage(
    {
      sessionId: params.sessionId,
      actorType: "assistant",
      content: safeOutput,
      contentType: "text",
      disclaimerFlags: constraints.disclaimers,
    },
    supabase,
  );

  // 8. Log (no raw content)
  await insertLog(
    {
      sessionId: params.sessionId,
      actorId: params.actor.userId,
      eventType: "message_sent",
      metadata: { content_type: "text" },
    },
    supabase,
  ).catch(() => {});

  return { message: assistantMsg };
}

// ---------------------------------------------------------------------------
// resolveAIGuidanceContext — THE ONLY PATH from domain data to model
// ---------------------------------------------------------------------------

export async function resolveAIGuidanceContext(
  actor: PolicyActor,
  session: AIGuidanceSession,
  _supabase?: SupabaseClient,
): Promise<AIGuidanceContext> {
  // Only fetch what's authorized for this actor/surface.
  // In v1, we provide safe summaries only — never raw data.
  return {
    actorUserId: actor.userId,
    surfaceType: session.surfaceType,
    language: session.language,
    intakeStatus: null,   // Wired when intake domain provides summary endpoint
    caseStatus: null,     // Wired when case domain provides summary endpoint
    workflowSummary: null, // Wired when linked object provides context
  };
}

// ---------------------------------------------------------------------------
// Constraint profiles
// ---------------------------------------------------------------------------

export function resolveAIConstraintProfile(
  actor: PolicyActor,
  session: AIGuidanceSession,
): AIConstraintProfile {
  const base: AIConstraintProfile = {
    surfaceType: session.surfaceType,
    legalAdviceAllowed: false,
    escalationRequired: true,
    draftingAllowed: false,
    allowedContentTypes: ["text", "explanation", "checklist", "escalation"],
    toneRules: [
      "Use plain language at sixth-to-eighth grade reading level.",
      "Be warm, supportive, and patient.",
      "Never use urgency language or time pressure.",
      "Never make promises about outcomes.",
    ],
    disclaimers: [
      "This is general guidance, not legal advice.",
      "For emergencies, call 911 or the crisis resources provided.",
    ],
  };

  if (actor.accountType === "provider" && session.surfaceType === "provider_copilot") {
    base.draftingAllowed = true;
    base.allowedContentTypes = ["text", "explanation", "checklist", "escalation", "draft"];
    base.toneRules = [
      "Professional tone for provider audience.",
      "Reference specific workflow steps.",
    ];
    base.disclaimers = [
      "AI-generated draft — human review required before use.",
    ];
  }

  return base;
}

// ---------------------------------------------------------------------------
// Prompt bundle builder
// ---------------------------------------------------------------------------

export function buildAIGuidancePromptBundle(
  context: AIGuidanceContext,
  constraints: AIConstraintProfile,
  history: AIGuidanceMessage[],
): {
  systemPrompt: string;
  conversationHistory: Array<{ role: string; content: string }>;
} {
  const systemPrompt = [
    "You are the NxtStps digital advocate — a trauma-informed, multilingual AI guidance system.",
    "You help applicants navigate compensation and service workflows.",
    "",
    "HARD RULES:",
    "- You NEVER provide legal advice. Say 'I can explain how this works, but for legal advice please speak with an attorney.'",
    "- You NEVER guarantee outcomes. Use 'may', 'typically', 'in many cases' — never 'will' or 'guaranteed'.",
    "- You NEVER diagnose or provide clinical advice.",
    "- If someone is in crisis or distress, direct them to crisis resources immediately.",
    "- Use plain language at sixth-to-eighth grade reading level.",
    "- Be warm, supportive, and patient.",
    "",
    `Surface: ${context.surfaceType}`,
    `Language: ${context.language}`,
    context.workflowSummary ? `Workflow context: ${context.workflowSummary}` : "",
    "",
    "Disclaimers to include in responses:",
    ...constraints.disclaimers.map((d) => `- ${d}`),
  ]
    .filter(Boolean)
    .join("\n");

  const conversationHistory = history
    .filter((m) => m.actorType === "user" || m.actorType === "assistant")
    .map((m) => ({
      role: m.actorType === "user" ? "user" : "assistant",
      content: m.content,
    }));

  return { systemPrompt, conversationHistory };
}

// ---------------------------------------------------------------------------
// Model call — server-side ONLY
// ---------------------------------------------------------------------------

/**
 * Calls the Anthropic API server-side. In v1, this is a placeholder that
 * returns a static response — actual API integration requires the
 * ANTHROPIC_API_KEY environment variable to be configured.
 *
 * When wired: POST https://api.anthropic.com/v1/messages
 * Model: claude-sonnet-4-6
 */
export async function callAIModel(
  _promptBundle: ReturnType<typeof buildAIGuidancePromptBundle>,
): Promise<string> {
  // v1 placeholder — returns a helpful static response.
  // When ANTHROPIC_API_KEY is set, this will call the real API.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return "I'm here to help you navigate this process. What would you like to know about your next steps?";
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: _promptBundle.systemPrompt,
        messages: _promptBundle.conversationHistory,
      }),
    });
    const data = (await response.json()) as { content?: Array<{ text: string }> };
    return data.content?.[0]?.text ?? "I'm here to help. Could you tell me more about what you need?";
  } catch {
    return "I'm having trouble connecting right now. Please try again in a moment.";
  }
}

// ---------------------------------------------------------------------------
// Governance guardrails — post-processing
// ---------------------------------------------------------------------------

export function applyAIGovernanceGuardrails(
  content: string,
  constraints: AIConstraintProfile,
): string {
  let safe = content;
  // Strip certainty language.
  safe = safe.replace(/\b(you will definitely|guaranteed|I promise|certainly will)\b/gi, "may");
  safe = safe.replace(/\b(I am a lawyer|legal advice|I diagnose)\b/gi, "[guidance only]");

  // Append disclaimer if not already present.
  if (constraints.disclaimers.length > 0 && !safe.includes("not legal advice")) {
    safe += `\n\n_${constraints.disclaimers[0]}_`;
  }

  return safe;
}
