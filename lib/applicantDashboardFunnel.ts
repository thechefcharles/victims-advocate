/**
 * Coarse funnel phases for the applicant dashboard stepper (eligibility → application → support).
 * UI-only; does not replace routing for the primary CTA.
 */

export type FunnelStepId = "eligibility" | "application" | "support";

/** `skipped` = user continued without completing eligibility check (warning / red segment). */
export type FunnelStepState = "complete" | "current" | "pending" | "skipped";

export type FunnelSteps = Record<FunnelStepId, FunnelStepState>;

/** Whether the user may navigate via the progress bar to this step (sequential gate). */
export function canClickVictimFunnelStep(step: FunnelStepId, steps: FunnelSteps): boolean {
  if (step === "eligibility") return true;
  if (step === "application") {
    return steps.eligibility === "complete" || steps.eligibility === "skipped";
  }
  if (step === "support") {
    return steps.application === "complete";
  }
  return false;
}

type CaseLike = {
  eligibility_result?: string | null;
  status?: string | null;
  application?: unknown;
};

/**
 * True when the applicant chose “skip to form” / continue without eligibility (stored on application JSON).
 */
export function getEligibilitySkippedFromApplication(application: unknown): boolean {
  if (!application || typeof application !== "object") return false;
  const dash = (application as Record<string, unknown>)._dashboard;
  if (!dash || typeof dash !== "object") return false;
  return Boolean((dash as Record<string, unknown>).skippedEligibility);
}

/**
 * Derive funnel steps from case data.
 * - Eligibility skipped (no result, flag set): first segment is `skipped` (red); Apply / Track can still proceed.
 * - No eligibility result, not skipped: eligibility is `current`.
 * - Eligibility result set, draft: application `current`.
 * - Submitted / closed: support phase.
 * - Application is “complete” when the case is no longer `draft` (e.g. submitted). A future
 *   “Submit CVC form” control may set status or a `_dashboard` flag; adjust this function then.
 */
export function getVictimFunnelSteps(input: {
  caseCount: number;
  focusCase: CaseLike | undefined | null;
}): FunnelSteps {
  if (input.caseCount === 0) {
    return {
      eligibility: "current",
      application: "pending",
      support: "pending",
    };
  }

  const c = input.focusCase;
  if (!c) {
    return {
      eligibility: "current",
      application: "pending",
      support: "pending",
    };
  }

  const eligibilitySkipped = getEligibilitySkippedFromApplication(c.application);
  const hasEligibilityResult = Boolean(c.eligibility_result);

  if (eligibilitySkipped && !hasEligibilityResult) {
    const status = (c.status ?? "draft").toLowerCase();
    if (status === "draft") {
      return {
        eligibility: "skipped",
        application: "current",
        support: "pending",
      };
    }
    return {
      eligibility: "skipped",
      application: "complete",
      support: "current",
    };
  }

  if (!hasEligibilityResult) {
    return {
      eligibility: "current",
      application: "pending",
      support: "pending",
    };
  }

  const status = (c.status ?? "draft").toLowerCase();
  if (status === "draft") {
    return {
      eligibility: "complete",
      application: "current",
      support: "pending",
    };
  }

  return {
    eligibility: "complete",
    application: "complete",
    support: "current",
  };
}
