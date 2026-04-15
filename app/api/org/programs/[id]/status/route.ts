/**
 * PATCH /api/org/programs/[id]/status — update capacity_status / accepting_referrals.
 * Capacity transitions emit `program.capacity_updated` trust signal.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  updateProgramStatus,
  type CapacityStatus,
  type UpdateStatusInput,
} from "@/lib/server/orgPrograms/orgProgramService";

export const runtime = "nodejs";

const CAPACITY_STATUSES: CapacityStatus[] = ["open", "limited", "waitlist", "paused"];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;
    if (!id) return apiFail("VALIDATION_ERROR", "Missing program id.");
    const body = (await req.json().catch(() => ({}))) as {
      capacityStatus?: unknown;
      acceptingReferrals?: unknown;
    };
    const input: UpdateStatusInput = {};
    if (typeof body.capacityStatus === "string") {
      if (!CAPACITY_STATUSES.includes(body.capacityStatus as CapacityStatus)) {
        return apiFail("VALIDATION_ERROR", "Invalid capacityStatus.");
      }
      input.capacityStatus = body.capacityStatus as CapacityStatus;
    }
    if (typeof body.acceptingReferrals === "boolean") {
      input.acceptingReferrals = body.acceptingReferrals;
    }
    const updated = await updateProgramStatus(ctx, id, input);
    return apiOk(updated);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.programs.status.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
