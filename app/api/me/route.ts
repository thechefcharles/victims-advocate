/**
 * Phase 2: Returns current auth context for client (role, org, etc).
 */

import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { apiFail, apiFailFromError, apiOk, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getPersonalInfoForUserId } from "@/lib/server/profile/getPersonalInfo";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { parseAdvocatePersonalInfo } from "@/lib/personalInfo";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) {
      return apiFail("AUTH_REQUIRED", "Unauthorized", undefined, 401);
    }

    let personalInfo = null;
    let advocatePersonalInfo = null;
    let organizationName: string | null = null;

    if (ctx.role === "victim") {
      try {
        personalInfo = await getPersonalInfoForUserId(ctx.userId);
      } catch (e) {
        logger.warn("me.get.personal_info", { message: String(e) });
      }
    } else if (ctx.role === "advocate") {
      try {
        const supabase = getSupabaseAdmin();
        const { data: prof } = await supabase
          .from("profiles")
          .select("personal_info")
          .eq("id", ctx.userId)
          .maybeSingle();
        advocatePersonalInfo = parseAdvocatePersonalInfo(prof?.personal_info);
        if (ctx.orgId) {
          const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", ctx.orgId)
            .maybeSingle();
          organizationName = (org?.name as string | undefined)?.trim() || null;
        }
      } catch (e) {
        logger.warn("me.get.advocate_personal_info", { message: String(e) });
      }
    }

    return apiOk({
      userId: ctx.userId,
      email: ctx.user.email ?? null,
      role: ctx.role,
      realRole: ctx.realRole ?? ctx.role,
      isAdmin: ctx.isAdmin,
      orgId: ctx.orgId,
      orgRole: ctx.orgRole,
      affiliatedCatalogEntryId: ctx.affiliatedCatalogEntryId,
      organizationCatalogEntryId: ctx.organizationCatalogEntryId,
      emailVerified: ctx.emailVerified,
      accountStatus: ctx.accountStatus,
      personalInfo,
      advocatePersonalInfo,
      organizationName,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("me.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
