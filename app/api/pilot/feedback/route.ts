import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiFail, apiFailFromError, apiOk, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getPlatformStatus } from "@/lib/legal/platformLegalConfig";

const CATEGORIES = new Set(["bug", "feature_not_working", "confusing_instructions", "other"]);

export async function POST(req: Request) {
  try {
    if (getPlatformStatus() === "production") {
      return apiFail("VALIDATION_ERROR", "Feedback collection is not available in production.", undefined, 422);
    }

    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "Invalid request body.", undefined, 422);
    }

    const category =
      typeof (body as { category?: string }).category === "string"
        ? (body as { category: string }).category.trim()
        : "";
    if (!CATEGORIES.has(category)) {
      return apiFail("VALIDATION_ERROR", "Please choose a valid issue type.", undefined, 422);
    }

    const message =
      typeof (body as { message?: string }).message === "string"
        ? (body as { message: string }).message.trim().slice(0, 8000)
        : "";
    const affectsApplication = (body as { affectsApplication?: boolean }).affectsApplication === true;
    const pathname =
      typeof (body as { pathname?: string }).pathname === "string"
        ? (body as { pathname: string }).pathname.trim().slice(0, 2048)
        : null;

    const userAgent = req.headers.get("user-agent")?.slice(0, 2000) ?? null;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("pilot_platform_feedback").insert({
      user_id: ctx.userId,
      pathname,
      category,
      message: message || null,
      affects_application: affectsApplication,
      user_agent: userAgent,
    });

    if (error) throw new Error(error.message);

    return apiOk({ ok: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("pilot.feedback.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
