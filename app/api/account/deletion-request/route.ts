/**
 * User-initiated account/data deletion request (standard or immediate safety path).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiFail, apiFailFromError, apiOk, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { sendDeletionAcknowledgmentEmail } from "@/lib/server/email/sendDeletionAcknowledgmentEmail";

function parseInet(ip: string | null): string | null {
  if (!ip?.trim()) return null;
  const trimmed = ip.trim();
  if (trimmed.length > 45) return null;
  return trimmed;
}

function clientIp(req: Request): string | null {
  return (
    parseInet(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null) ??
    parseInet(req.headers.get("x-real-ip")) ??
    null
  );
}

type DeletionType = "standard" | "safety";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => null);
    const rawType = body && typeof body === "object" ? (body as { deletionType?: string }).deletionType : null;
    const deletionType: DeletionType | null =
      rawType === "safety" ? "safety" : rawType === "standard" ? "standard" : null;
    if (!deletionType) {
      return apiFail("VALIDATION_ERROR", "Select a valid deletion option.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const nowIso = new Date().toISOString();
    const ip = clientIp(req);

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("deletion_requested, account_status")
      .eq("id", ctx.userId)
      .maybeSingle();

    if (profErr || !profile) {
      return apiFail("NOT_FOUND", "Profile not found.", undefined, 404);
    }

    if (profile.deletion_requested === true) {
      return apiFail(
        "CONFLICT",
        "A deletion request is already on file for this account.",
        undefined,
        409
      );
    }

    if (profile.account_status === "deleted" || profile.account_status === "disabled") {
      return apiFail("VALIDATION_ERROR", "This account cannot submit a deletion request.", undefined, 422);
    }

    const priority = deletionType === "safety" ? "urgent" : "normal";
    const nextAccountStatus = deletionType === "safety" ? "deleted" : undefined;

    const { error: qErr } = await supabase.from("account_deletion_queue").insert({
      user_id: ctx.userId,
      deletion_type: deletionType,
      priority,
      status: "pending",
      request_ip: ip,
      metadata: {},
    });
    if (qErr) throw new Error(qErr.message);

    const updatePayload: Record<string, unknown> = {
      deletion_requested: true,
      deletion_requested_at: nowIso,
      deletion_type: deletionType,
      deletion_request_ip: ip,
      updated_at: nowIso,
    };
    if (nextAccountStatus) {
      updatePayload.account_status = nextAccountStatus;
    }

    const { error: upErr } = await supabase.from("profiles").update(updatePayload).eq("id", ctx.userId);
    if (upErr) throw new Error(upErr.message);

    if (deletionType === "safety") {
      const { error: banErr } = await supabase.auth.admin.updateUserById(ctx.userId, {
        ban_duration: "240000h",
      });
      if (banErr) {
        logger.error("deletion.safety.ban_failed", { userId: ctx.userId, message: banErr.message });
      }
    } else {
      const email = ctx.user.email?.trim();
      if (email) {
        await sendDeletionAcknowledgmentEmail({ toEmail: email });
      }
    }

    logger.info("deletion.request.recorded", {
      userId: ctx.userId,
      deletionType,
      priority,
    });

    return apiOk({ ok: true, deletionType });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("deletion.request.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
