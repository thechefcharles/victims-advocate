import { z } from "zod";
import { REFERRAL_STATUSES } from "./types";

export const referralStatusSchema = z.enum(REFERRAL_STATUSES);

const uuid = z.string().uuid();

/**
 * Validates referral creation payloads (e.g. from future API routes).
 * `requested_by_user_id` is never taken from the client — set from AuthContext in the service.
 */
export const createReferralPayloadSchema = z
  .object({
    caseId: uuid,
    fromOrganizationId: uuid.nullable(),
    toOrganizationId: uuid,
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type CreateReferralPayloadParsed = z.infer<typeof createReferralPayloadSchema>;
