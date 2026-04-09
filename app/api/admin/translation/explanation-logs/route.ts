/**
 * Domain 2.4: Translation / i18n — admin explanation log viewer.
 * GET /api/admin/translation/explanation-logs
 *
 * Platform admin only. Returns hash + length + status, NEVER the raw source
 * text or the explanation_text body.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { listExplanationRequestsAdmin } from "@/lib/server/translation";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id") ?? undefined;
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw, 10) || 0, 1), 200) : 50;

    const supabase = getSupabaseAdmin();
    const result = await listExplanationRequestsAdmin(ctx, { userId, limit }, supabase);

    return NextResponse.json({ logs: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
