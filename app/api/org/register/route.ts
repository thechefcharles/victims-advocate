/**
 * Authenticated user creates an organization and becomes org_admin.
 * One org per user (unique user_id on org_memberships).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";

const ORG_TYPES = ["nonprofit", "hospital", "gov", "other"] as const;

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("org_memberships")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return apiFail(
        "VALIDATION_ERROR",
        "You already belong to an organization. Leave it before creating another.",
        undefined,
        400
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 422);
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim().toLowerCase() : "";

    if (!name) {
      return apiFail("VALIDATION_ERROR", "name is required", undefined, 422);
    }
    if (!ORG_TYPES.includes(type as (typeof ORG_TYPES)[number])) {
      return apiFail(
        "VALIDATION_ERROR",
        `type must be one of: ${ORG_TYPES.join(", ")}`,
        undefined,
        422
      );
    }

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({
        name,
        type,
        status: "active",
        created_by: ctx.userId,
      })
      .select("id, created_at, name, type, status")
      .single();

    if (orgErr || !org) {
      throw new AppError("INTERNAL", orgErr?.message ?? "Failed to create organization", undefined, 500);
    }

    const { error: memErr } = await supabase.from("org_memberships").insert({
      user_id: ctx.userId,
      organization_id: org.id,
      org_role: "org_admin",
      status: "active",
      created_by: ctx.userId,
    });

    if (memErr) {
      await supabase.from("organizations").delete().eq("id", org.id);
      throw new AppError("INTERNAL", "Failed to create membership", undefined, 500);
    }

    await logEvent({
      ctx,
      action: "org.create",
      resourceType: "organization",
      resourceId: org.id,
      organizationId: org.id,
      metadata: { name: org.name, type: org.type },
      req,
    });

    logger.info("org.register", { userId: ctx.userId, orgId: org.id });

    return apiOk({ organization: org, message: "Organization created. You are the org admin." }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.register.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
