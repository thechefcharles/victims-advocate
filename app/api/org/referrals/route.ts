import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { listOrgReferralsInboxEnriched } from "@/lib/server/referrals/service";
import type { ReferralStatus } from "@/lib/server/referrals/types";
import { REFERRAL_STATUSES } from "@/lib/server/referrals/types";

const STATUS_SET = new Set<string>(REFERRAL_STATUSES);

function parseStatusQuery(raw: string | null): ReferralStatus | ReferralStatus[] | undefined {
  if (raw == null || raw.trim() === "" || raw.trim().toLowerCase() === "all") {
    return undefined;
  }
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const filtered = parts.filter((p) => STATUS_SET.has(p)) as ReferralStatus[];
  if (filtered.length === 0) return "pending";
  if (filtered.length === 1) return filtered[0];
  return filtered;
}

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("organization_id")?.trim();
    const orgId = ctx.isAdmin && orgIdParam ? orgIdParam : ctx.orgId;

    if (!orgId) {
      return apiFail("VALIDATION_ERROR", "organization_id required.", undefined, 422);
    }

    const actor = buildActor(ctx);
    const decision = await can("org:manage_members", actor, { type: "org", id: orgId, ownerId: orgId });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const statusParam = searchParams.get("status");
    const status =
      statusParam === null || statusParam === ""
        ? "pending"
        : parseStatusQuery(statusParam);

    const items = await listOrgReferralsInboxEnriched({ ctx, organizationId: orgId, status });
    if (items === null) {
      return apiFail("FORBIDDEN", "Access denied", undefined, 403);
    }

    return apiOk({ referrals: items });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("org.referrals.get.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
