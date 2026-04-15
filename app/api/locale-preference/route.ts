/**
 * Domain 2.4: Translation / i18n — locale preference route.
 *
 * GET   /api/locale-preference  → returns the caller's stored locale (or null)
 * PATCH /api/locale-preference  → sets the caller's locale (en | es)
 *
 * Authenticated users only. Owner-gated by the policy engine. Anonymous users
 * continue to use localStorage on the client (i18nProvider.tsx fallback).
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getLocalePreference,
  updateLocalePreference,
} from "@/lib/server/translation";
import type { LocaleCode } from "@nxtstps/registry";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const supabase = getSupabaseAdmin();
    const result = await getLocalePreference(ctx, supabase);

    return NextResponse.json({ preference: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = (await req.json().catch(() => ({}))) as { locale?: string };
    if (body.locale !== "en" && body.locale !== "es") {
      throw new AppError(
        "VALIDATION_ERROR",
        "locale must be 'en' or 'es'.",
        undefined,
        422,
      );
    }

    const supabase = getSupabaseAdmin();
    const result = await updateLocalePreference(ctx, body.locale as LocaleCode, supabase);

    return NextResponse.json({ preference: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
