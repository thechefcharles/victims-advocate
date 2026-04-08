/**
 * Domain 2.2 — State Workflows: derived-data invalidation hook.
 *
 * Stub with handler-registration extension point. Domain 2.2 itself
 * registers no handlers — future domains (CVC Alignment Engine 2.3,
 * completeness scoring, search indexing) call registerInvalidationHandler()
 * during module initialization to opt in to invalidation events.
 *
 * Called by stateWorkflowService on every publish and every deprecate.
 * Failure of any handler is logged and swallowed; one failing handler
 * MUST NOT prevent other handlers from running.
 */

import { logEvent } from "@/lib/server/audit/logEvent";

export type InvalidationHandler = (
  stateCode: "IL" | "IN",
  configId: string,
) => Promise<void>;

const handlers: InvalidationHandler[] = [];

/**
 * Register an invalidation handler. Idempotent registration is the caller's
 * responsibility — registering the same function twice will result in two
 * invocations. Module-init code should guard against double-registration.
 */
export function registerInvalidationHandler(handler: InvalidationHandler): void {
  handlers.push(handler);
}

/**
 * Visible for testing only — clears the registered handler list. Production
 * code should not call this. Tests use it to isolate registrations.
 */
export function _resetInvalidationHandlersForTesting(): void {
  handlers.length = 0;
}

/**
 * Returns the current handler count. Useful for tests asserting that
 * registration / reset behaves as expected.
 */
export function _invalidationHandlerCountForTesting(): number {
  return handlers.length;
}

/**
 * Invokes every registered invalidation handler with the given state code
 * and config id. Always logs the call to console.warn (this is a stub —
 * the warn is intentional so it is visible during early-domain operation).
 * Always appends an audit event.
 *
 * Returns successfully even if individual handlers throw — failures are
 * logged but do not propagate.
 */
export async function invalidateWorkflowDerivedData(
  stateCode: "IL" | "IN",
  configId: string,
): Promise<void> {
  console.warn(
    `[stateWorkflows.invalidation] invalidateWorkflowDerivedData(${stateCode}, ${configId}) — ${handlers.length} handler(s) registered`,
  );

  void logEvent({
    ctx: null,
    action: "workflow.state_transition",
    resourceType: "state_workflow_config",
    resourceId: configId,
    severity: "info",
    metadata: {
      action_subtype: "state_workflow.invalidation_triggered",
      state_code: stateCode,
      handler_count: handlers.length,
    },
  });

  for (const handler of handlers) {
    try {
      await handler(stateCode, configId);
    } catch (err) {
      console.warn(
        `[stateWorkflows.invalidation] handler failed for config ${configId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
