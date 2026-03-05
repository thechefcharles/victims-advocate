/**
 * Phase 2: Admin-only organization management.
 * POST: create org
 * GET: list orgs
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";

const ORG_TYPES = ["nonprofit", "hospital", "gov", "other"] as const;

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("organizations")
      .select("id, created_at, name, type, status, created_by")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return apiOk({ orgs: data ?? [] });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.orgs.list.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
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

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name,
        type,
        status: "active",
        created_by: ctx.userId,
      })
      .select("id, created_at, name, type, status")
      .single();

    if (error) throw new Error(error.message);

    await logEvent({
      ctx,
      action: "org.create",
      resourceType: "organization",
      resourceId: data.id,
      organizationId: data.id,
      metadata: { name: data.name, type: data.type },
      req,
    });

    return apiOk(data, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.orgs.create.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
