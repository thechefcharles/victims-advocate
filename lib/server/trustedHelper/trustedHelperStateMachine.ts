/**
 * Domain 5.1 — Trusted helper state machine.
 *
 * Valid transitions:
 *   pending → active | revoked
 *   active  → revoked | expired
 *   revoked → (terminal — no reactivation)
 *   expired → (terminal — no reactivation)
 *
 * Reissuing access after revoke/expire requires creating a NEW grant.
 */

import { AppError } from "@/lib/server/api";
import type { TrustedHelperAccessStatus } from "./trustedHelperTypes";

const VALID_TRANSITIONS: Record<TrustedHelperAccessStatus, TrustedHelperAccessStatus[]> = {
  pending: ["active", "revoked"],
  active:  ["revoked", "expired"],
  revoked: [],
  expired: [],
};

export function validateHelperGrantTransition(
  current: TrustedHelperAccessStatus,
  next: TrustedHelperAccessStatus,
): void {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Unknown trusted helper status: '${current}'.`,
      undefined,
      422,
    );
  }
  if (!allowed.includes(next)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Trusted helper grant cannot transition from '${current}' to '${next}'.`,
      undefined,
      422,
    );
  }
}
