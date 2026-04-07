/**
 * Domain 0.4 — Workflow State Infrastructure public surface.
 *
 * Import everything from here:
 *   import { transition, isValidTransition, VALID_TRANSITIONS } from "@/lib/server/workflow"
 *   import type { TransitionParams, WorkflowTransitionResult } from "@/lib/server/workflow"
 *
 * Do NOT import directly from sub-files in new code.
 */

export { transition } from "./engine";
export { isValidTransition, VALID_TRANSITIONS } from "./transitions";
export type {
  WorkflowEntityType,
  WorkflowTransition,
  WorkflowTransitionResult,
  WorkflowLogEntry,
  TransitionParams,
} from "./types";
