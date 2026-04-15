/**
 * Domain 7.3 — Production model invoker.
 *
 * THE ONLY FILE in the repo permitted to instantiate an Anthropic / OpenAI
 * SDK client. Every AI service in the platform routes its model calls
 * through the orchestrator, which delegates to a ModelInvoker. This module
 * provides the production implementation.
 *
 * Tests pass their own deterministic ModelInvoker stub — never call this
 * function in a test environment.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ModelInvoker, ModelResponse } from "./aiOrchestrator";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY missing — cannot invoke Claude. Set it in the server env or inject a test ModelInvoker.",
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/**
 * Production invoker. Uses the Anthropic Messages API. Tool execution is
 * handled by the orchestrator itself (aiToolRuntime.executeToolCall) — this
 * invoker only returns text + tool-call structure for the orchestrator to
 * then resolve.
 */
export const productionModelInvoker: ModelInvoker = async (input) => {
  const client = getClient();
  const completion = await client.messages.create({
    model: input.model,
    max_tokens: input.maxTokens,
    system: input.systemPrompt,
    messages: [
      {
        role: "user",
        content: buildUserContent(input.userMessage, input.contextBundle),
      },
    ],
  });

  const textBlock = completion.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

  const toolUseBlocks = completion.content.filter((b) => b.type === "tool_use");
  const toolCalls = toolUseBlocks.map((b) => ({
    name: b.type === "tool_use" ? b.name : "",
    params: b.type === "tool_use" ? b.input : {},
  }));

  const response: ModelResponse = { text, toolCalls };
  return response;
};

function buildUserContent(
  userMessage: string,
  contextBundle: Record<string, unknown>,
): string {
  const keys = Object.keys(contextBundle).filter(
    (k) => contextBundle[k] !== null && contextBundle[k] !== undefined,
  );
  if (keys.length === 0) return userMessage;
  const contextBlock = keys
    .map((k) => `${k}: ${JSON.stringify(contextBundle[k])}`)
    .join("\n");
  return `Context:\n${contextBlock}\n\nUser message:\n${userMessage}`;
}

/**
 * Factory used by services that need to fall back to the built-in stub when
 * no API key is configured (e.g. tests that don't mock orchestrate but also
 * don't want to pull the real SDK path).
 */
const STUB_INVOKER: ModelInvoker = async ({ userMessage }) => ({
  text: `[aiOps stub response to: ${userMessage.slice(0, 80)}]`,
});

/**
 * Services call this to get a usable invoker. Falls back to a deterministic
 * stub when ANTHROPIC_API_KEY is absent — lets dev + test runs proceed
 * without real SDK traffic while production automatically uses the real SDK.
 */
export function resolveModelInvoker(): ModelInvoker {
  if (!process.env.ANTHROPIC_API_KEY) return STUB_INVOKER;
  return productionModelInvoker;
}
