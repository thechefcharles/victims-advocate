/**
 * Domain 4.3 — Event state machine.
 *
 * Valid transitions:
 *   draft       → published | cancelled
 *   published   → cancelled | closed
 *   cancelled   → closed
 *   closed      → (terminal — no reopening in v1)
 *
 * Pure function — no DB access, no side effects.
 */

import { AppError } from "@/lib/server/api";
import type { EventStatus } from "./eventTypes";

const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft:     ["published", "cancelled"],
  published: ["cancelled", "closed"],
  cancelled: ["closed"],
  closed:    [],
};

export function validateEventTransition(current: EventStatus, next: EventStatus): void {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Unknown event status: '${current}'.`,
      undefined,
      422,
    );
  }
  if (!allowed.includes(next)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Event cannot transition from '${current}' to '${next}'.`,
      undefined,
      422,
    );
  }
}
