/**
 * Domain 2.3 — CVC Form Processing: generate route.
 * POST /api/cases/:id/generate-cvc
 *
 * Synchronous v1: creates an output_generation_job, runs the render, stores
 * the PDF via documentService, and returns the completed job status.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generateCvcForm } from "@/lib/server/cvcForms";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const job = await generateCvcForm(ctx, id, supabase);

    return NextResponse.json({ job });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
