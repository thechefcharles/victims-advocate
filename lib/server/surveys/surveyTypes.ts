/**
 * Domain 6.1 — Survey (Category 4: Victim Experience & Dignity) types.
 *
 * Survey logs are anonymous by design: no applicant, case, or advocate id is
 * ever persisted. The only link is survey_id → organization_id.
 */

export type SurveyTriggerType =
  | "first_advocate_interaction"
  | "application_submission";

export const SURVEY_RESPONSE_THRESHOLD = 10 as const;
export const SURVEY_TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

/** The 5 dimensions the applicant rates on a 1–5 Likert scale. */
export interface SurveyResponses {
  feltHeard: number;
  advocateClarity: number;
  feltSafe: number;
  rightsExplained: number;
  likelihoodToRecommend: number;
}

/** Aggregate shape returned by getSurveyAggregate. */
export interface SurveyAggregate {
  organizationId: string;
  responseCount: number;
  meetsThreshold: boolean;
  averages: SurveyResponses | null;
}
