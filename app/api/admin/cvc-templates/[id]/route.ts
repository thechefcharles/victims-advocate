/**
 * Domain 2.3 — CVC Form Processing: admin get / update.
 * GET   /api/admin/cvc-templates/:id
 * PATCH /api/admin/cvc-templates/:id
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getCvcFormTemplate,
  updateCvcFormTemplate,
} from "@/lib/server/cvcForms";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const result = await getCvcFormTemplate(ctx, id, supabase);

    return NextResponse.json({ template: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}

export async function PATCH(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const patch: { form_name?: string; source_pdf_path?: string | null } = {};
    if (typeof body.form_name === "string") patch.form_name = body.form_name;
    if (typeof body.source_pdf_path === "string" || body.source_pdf_path === null) {
      patch.source_pdf_path = body.source_pdf_path;
    }

    const supabase = getSupabaseAdmin();
    const result = await updateCvcFormTemplate(ctx, id, patch, supabase);

    return NextResponse.json({ template: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
