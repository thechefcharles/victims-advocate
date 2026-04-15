/**
 * Public AI orchestration + escalation types.
 */

export type { AIModeKey } from "@/lib/server/aiOps/aiModeRegistry";
export type { OrchestratorResult } from "@/lib/server/aiOps/aiOrchestrator";
export type {
  EscalationResponse,
  EscalationResponseType,
} from "@/lib/server/aiGuidance/aiEscalationService";
export type { EscalationCategory } from "@/lib/server/aiGuidance/escalationDetector";
