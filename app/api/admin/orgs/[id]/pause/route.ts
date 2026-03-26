/**
 * Admin: pause public org profile visibility (public_profile_status → paused).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const { id: raw } = await params;
    const orgId = raw?.trim();
    if (!orgId || !UUID_RE.test(orgId)) {
      return apiFail("VALIDATION_ERROR", "Invalid organization id", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const { data: org, error: fetchErr } = await supabase
      .from("organizations")
      .select("id, name, status, public_profile_status")
      .eq("id", orgId)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!org) {
      return apiFail("NOT_FOUND", "Organization not found", undefined, 404);
    }

    const op = String(org.status ?? "");
    if (op === "archived") {
      return apiFail("VALIDATION_ERROR", "Cannot change public visibility on an archived organization.", undefined, 409);
    }

    const pub = String(org.public_profile_status ?? "draft");
    if (pub === "paused") {
      return apiOk({
        message: "Public profile is already paused.",
        public_profile_status: "paused",
        already_paused: true,
      });
    }

    const { error: upErr } = await supabase
      .from("organizations")
      .update({ public_profile_status: "paused" })
      .eq("id", orgId);

    if (upErr) throw new Error(upErr.message);

    await logEvent({
      ctx,
      action: "admin.org.public_profile_paused",
      resourceType: "organization",
      resourceId: orgId,
      organizationId: orgId,
      metadata: {
        name: org.name,
        from_public_profile_status: pub,
        to_public_profile_status: "paused",
      },
      req,
    });

    logger.info("admin.org.public_profile_paused", { orgId, adminId: ctx.userId });

    return apiOk({
      message: "Public organization profile is paused (listing/discovery off when enforcement applies).",
      public_profile_status: "paused",
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.org.pause.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
