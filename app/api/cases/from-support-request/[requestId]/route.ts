/**
 * Domain 1.2 — Case: create case from accepted support request.
 * POST /api/cases/from-support-request/:requestId
 *
 * Thin handler. All business logic in caseService.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createCaseFromSupportRequest } from "@/lib/server/cases/caseService";

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { requestId } = await context.params;
    const body = await req.json().catch(() => ({}));

    if (!body.organization_id) {
      return NextResponse.json(
        { error: "organization_id is required." },
        { status: 422 },
      );
    }

    const supabase = getSupabaseAdmin();
    const result = await createCaseFromSupportRequest(
      ctx,
      {
        support_request_id: requestId,
        organization_id: body.organization_id,
        program_id: body.program_id ?? null,
      },
      supabase,
    );

    return NextResponse.json({ case: result }, { status: 201 });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
