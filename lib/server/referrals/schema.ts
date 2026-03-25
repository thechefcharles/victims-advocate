import { z } from "zod";
import { REFERRAL_STATUSES } from "./types";

export const referralStatusSchema = z.enum(REFERRAL_STATUSES);

const uuid = z.string().uuid();

/** POST /api/cases/[id]/org-referrals body */
export const postCaseOrgReferralBodySchema = z
  .object({
    to_organization_id: uuid,
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type PostCaseOrgReferralBody = z.infer<typeof postCaseOrgReferralBodySchema>;

/**
 * Validates service-layer referral creation (case id from route + body fields).
 */
export const createCaseOrgReferralInputSchema = z
  .object({
    caseId: uuid,
    toOrganizationId: uuid,
    fromOrganizationId: uuid.nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type CreateCaseOrgReferralInputParsed = z.infer<typeof createCaseOrgReferralInputSchema>;
