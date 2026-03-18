/**
 * Phase D: Designation mapping thresholds (versioned with ORG_DESIGNATION_VERSION).
 */

export { ORG_DESIGNATION_VERSION } from "@/lib/designations/version";

/** Minimum score for comprehensive tier (when confidence allows) */
export const THRESHOLD_COMPREHENSIVE = 85;

/** Minimum score for established tier upper bound exclusive */
export const THRESHOLD_ESTABLISHED_MIN = 65;

/** Below this with low/ambiguous confidence → prefer insufficient_data over foundational */
export const THRESHOLD_FOUNDATIONAL_FLOOR = 45;
