/**
 * Admin-only: set "view as" role for testing victim vs advocate flows.
 * Sets cookie view_as_role (victim | advocate). Send role= or empty to clear.
 */

import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { apiFail, apiFailFromError, apiOk, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";

const COOKIE_NAME = "view_as_role";
const COOKIE_OPTS = "Path=/; HttpOnly; SameSite=Lax";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) {
      return apiFail("AUTH_REQUIRED", "Unauthorized", undefined, 401);
    }
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    let role: string | null = null;
    try {
      const body = await req.json().catch(() => ({}));
      const fromQuery = req.url ? new URL(req.url).searchParams.get("role") : null;
      role = body?.role ?? fromQuery ?? null;
    } catch {
      role = null;
    }
    const value = role?.trim().toLowerCase();
    const isClear = !value || value === "clear" || value === "";
    const validOverride = value === "victim" || value === "advocate";

    if (!isClear && !validOverride) {
      return NextResponse.json(
        apiFail("VALIDATION_ERROR", "role must be victim or advocate", undefined, 400),
        { status: 400 }
      );
    }

    const res = NextResponse.json(
      apiOk({ role: ctx.role, viewAs: validOverride ? value : null })
    );
    if (validOverride) {
      res.headers.set(
        "Set-Cookie",
        `${COOKIE_NAME}=${value}; ${COOKIE_OPTS}; Max-Age=86400`
      );
    } else {
      res.headers.set(
        "Set-Cookie",
        `${COOKIE_NAME}=; ${COOKIE_OPTS}; Max-Age=0`
      );
    }

    logger.info("me.view_as.set", {
      userId: ctx.userId,
      viewAs: validOverride ? value : null,
    });
    return res;
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("me.view_as.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
