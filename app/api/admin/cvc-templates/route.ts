/**
 * Domain 2.3 — CVC Form Processing: admin list/create.
 * GET  /api/admin/cvc-templates
 * POST /api/admin/cvc-templates
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  listCvcFormTemplatesAdmin,
  createCvcFormTemplate,
} from "@/lib/server/cvcForms";
import type { CvcFormTemplateStatus } from "@nxtstps/registry";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const url = new URL(req.url);
    const stateCode = url.searchParams.get("state_code");
    const status = url.searchParams.get("status");

    if (stateCode && stateCode !== "IL" && stateCode !== "IN") {
      throw new AppError("VALIDATION_ERROR", "state_code must be 'IL' or 'IN'.", undefined, 422);
    }
    if (status && status !== "draft" && status !== "active" && status !== "deprecated") {
      throw new AppError(
        "VALIDATION_ERROR",
        "status must be 'draft', 'active', or 'deprecated'.",
        undefined,
        422,
      );
    }

    const supabase = getSupabaseAdmin();
    const result = await listCvcFormTemplatesAdmin(
      ctx,
      {
        stateCode: (stateCode as "IL" | "IN" | null) ?? undefined,
        status: (status as CvcFormTemplateStatus | null) ?? undefined,
      },
      supabase,
    );

    return NextResponse.json({ templates: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => ({}));
    const stateCode = body.state_code;
    const formName = body.form_name;
    const templateId = body.template_id;

    if (stateCode !== "IL" && stateCode !== "IN") {
      throw new AppError("VALIDATION_ERROR", "state_code must be 'IL' or 'IN'.", undefined, 422);
    }
    if (typeof formName !== "string" || formName.length === 0) {
      throw new AppError("VALIDATION_ERROR", "form_name is required.", undefined, 422);
    }
    if (typeof templateId !== "string" || templateId.length === 0) {
      throw new AppError("VALIDATION_ERROR", "template_id is required.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const result = await createCvcFormTemplate(
      ctx,
      {
        state_code: stateCode,
        form_name: formName,
        template_id: templateId,
        source_pdf_path: typeof body.source_pdf_path === "string" ? body.source_pdf_path : null,
        seeded_from: typeof body.seeded_from === "string" ? body.seeded_from : null,
        state_workflow_config_id:
          typeof body.state_workflow_config_id === "string" ? body.state_workflow_config_id : null,
      },
      supabase,
    );

    return NextResponse.json({ template: result }, { status: 201 });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
