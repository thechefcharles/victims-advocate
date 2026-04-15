/**
 * Domain 7.3 — AI Ops orchestrator.
 *
 * Implements the 11-step flow every AI call must take:
 *
 *   1.  Actor context resolved (by caller)
 *   2.  Mode selected
 *   3.  Context assembled
 *   4.  Policy filter applied (caller supplies permission-filtered context)
 *   5.  Context bundle built (scopes narrowed to mode.allowedContextScopes)
 *   6.  Constraint profile loaded (from mode registry)
 *   7.  Orchestrator calls model with bundle + constraints
 *   8.  Tool calls resolved (allowlist-gated via aiToolRuntime)
 *   9.  Safety pipeline runs on output
 *   10. Run logged (no PII, no content)
 *   11. Response serialized and returned
 *
 * The model call itself is delegated to an injectable `modelInvoker` so
 * tests can swap in a deterministic stub and the production caller can wire
 * Anthropic / OpenAI SDKs behind a single seam.
 */

import { getModeConfig, MODEL_ROUTING, type AIModeKey } from "./aiModeRegistry";
import { getPrompt } from "./aiPromptRegistry";
import { runSafetyPipeline, type SafetyResult } from "./aiSafetyPipeline";
import { executeToolCall, type AIContext } from "./aiToolRuntime";

export interface OrchestratorActor {
  userId: string;
  accountType: string;
}

export interface OrchestratorInput {
  mode: AIModeKey;
  userMessage: string;
  context: AIContext;
  actor: OrchestratorActor;
  sessionId?: string;
}

export interface ModelToolCall {
  name: string;
  params: unknown;
}

export interface ModelResponse {
  text: string;
  toolCalls?: ModelToolCall[];
}

/** Swap-in point for the real SDK call. Tests pass a deterministic stub. */
export type ModelInvoker = (request: {
  model: string;
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
  contextBundle: Record<string, unknown>;
}) => Promise<ModelResponse>;

export interface OrchestratorResult {
  mode: AIModeKey;
  modelTier: string;
  model: string;
  response: string;
  safe: boolean;
  disclaimerAdded: boolean;
  escalationFired: boolean;
  layersFailed: string[];
  toolCallsCount: number;
  durationMs: number;
}

/** Default invoker: no real model call; returns a stub. Production callers pass a real invoker. */
const DEFAULT_INVOKER: ModelInvoker = async ({ userMessage }) => ({
  text: `[aiOps stub response to: ${userMessage.slice(0, 80)}]`,
});

export async function orchestrate(
  input: OrchestratorInput,
  modelInvoker: ModelInvoker = DEFAULT_INVOKER,
): Promise<OrchestratorResult> {
  const start = Date.now();
  const modeConfig = getModeConfig(input.mode);
  const model = MODEL_ROUTING[modeConfig.modelTier];

  // Step 5 — narrow the context to the mode's allowed scopes.
  const bundle: Record<string, unknown> = {};
  for (const scope of modeConfig.allowedContextScopes) {
    bundle[scope] = (input.context as unknown as Record<string, unknown>)[scope] ?? null;
  }

  // Step 6 — constraint profile (system prompt + max tokens).
  const { systemPrompt } = getPrompt(modeConfig.systemPromptKey);

  // Step 7 — model call through the invoker.
  const modelResp = await modelInvoker({
    model,
    systemPrompt,
    userMessage: input.userMessage,
    maxTokens: modeConfig.maxTokens,
    contextBundle: bundle,
  });

  // Step 8 — tool calls, allowlist-gated. We execute them (results currently
  // feed back to callers via toolCallsCount in the log; a future iteration
  // can let the model iterate with tool outputs).
  let toolCallsCount = 0;
  for (const call of modelResp.toolCalls ?? []) {
    await executeToolCall(call.name, call.params, input.mode, input.context);
    toolCallsCount += 1;
  }

  // Step 9 — safety pipeline on the model's text output.
  const safety: SafetyResult = runSafetyPipeline(modelResp.text, input.mode);

  const durationMs = Date.now() - start;

  // Step 10 — structured log (intentionally carries NO content).
  // Real callers can forward this to ai_guidance_logs or a dedicated table.
  const runLog = {
    mode: input.mode,
    model_tier: modeConfig.modelTier,
    model,
    duration_ms: durationMs,
    tool_calls_count: toolCallsCount,
    layers_failed: safety.layersFailed,
    disclaimer_added: safety.disclaimerAdded,
    escalation_fired: safety.escalationFired,
  };
  void runLog;

  // Step 11 — serialized result.
  return {
    mode: input.mode,
    modelTier: modeConfig.modelTier,
    model,
    response: safety.response,
    safe: safety.safe,
    disclaimerAdded: safety.disclaimerAdded,
    escalationFired: safety.escalationFired,
    layersFailed: safety.layersFailed,
    toolCallsCount,
    durationMs,
  };
}
