/**
 * Domain 2.5 — Per-state intake requirements.
 *
 * Mirrors the boolean flags on `state_workflow_configs` so client code can
 * reason about state-specific rules without an `if (stateCode === "IN")`
 * branch inside lib/intake/* (those branches are forbidden by spec).
 *
 * Source of truth at runtime is the DB row. This shim returns the same
 * static defaults so unmigrated callers continue to work; once a caller
 * has the resolved config row it should pass `requirementsFromConfig(row)`
 * instead.
 */

export interface StateRequirements {
  /** Last-4 SSN required on applicant + victim sections. */
  requiresLast4Ssn: boolean;
  /** Intake must capture contact.whoIsSubmitting. */
  requiresSubmitterType: boolean;
}

const STATIC: Record<string, StateRequirements> = {
  IN: { requiresLast4Ssn: true, requiresSubmitterType: true },
};

const DEFAULT: StateRequirements = {
  requiresLast4Ssn: false,
  requiresSubmitterType: false,
};

/**
 * Static defaults keyed by 2-letter state code. Used as a fallback when no
 * `state_workflow_configs` row has been resolved (e.g., client renders that
 * don't have an async path to the DB).
 */
export function staticStateRequirements(stateCode: string): StateRequirements {
  return STATIC[(stateCode ?? "").toUpperCase()] ?? DEFAULT;
}

/**
 * Build requirements from a state_workflow_configs row. Use this when the
 * caller has already resolved the config — it always wins over the static
 * shim and tracks future column additions automatically.
 */
export function requirementsFromConfig(
  row: { requires_last4_ssn?: boolean | null; requires_submitter_type?: boolean | null } | null,
): StateRequirements {
  if (!row) return DEFAULT;
  return {
    requiresLast4Ssn: row.requires_last4_ssn === true,
    requiresSubmitterType: row.requires_submitter_type === true,
  };
}
