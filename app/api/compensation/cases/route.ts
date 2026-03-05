// app/api/compensation/cases/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { listCasesForUser } from "@/lib/server/data";
import type { CompensationApplication } from "@/lib/compensationSchema";

type CaseStatus = "draft" | "ready_for_review" | "submitted" | "closed";

type CreateCaseBody =
  | { application: unknown; status?: CaseStatus; state_code?: string }
  | { caseId?: string; application: unknown; status?: CaseStatus; state_code?: string } // tolerated
  | unknown; // legacy: raw application object

/**
 * Prevents the "jsonb contains a stringified JSON" problem.
 * Accepts:
 * - object => returns object
 * - JSON string => parses once or twice if needed
 */
function normalizeApplication(raw: unknown): CompensationApplication | null {
  if (!raw) return null;

  // already an object
  if (typeof raw === "object") return raw as CompensationApplication;

  // stringified JSON (possibly double-stringified)
  if (typeof raw === "string") {
    try {
      const once = JSON.parse(raw);
      if (typeof once === "object" && once) return once as CompensationApplication;

      if (typeof once === "string") {
        const twice = JSON.parse(once);
        if (typeof twice === "object" && twice) return twice as CompensationApplication;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeStatus(maybe: unknown): CaseStatus {
  const allowed: CaseStatus[] = ["draft", "ready_for_review", "submitted", "closed"];
  return allowed.includes(maybe as CaseStatus) ? (maybe as CaseStatus) : "draft";
}

function normalizeStateCode(maybe: unknown): string {
  const s = typeof maybe === "string" ? maybe.trim().toUpperCase() : "";
  const allowed = ["IL", "IN"];
  return allowed.includes(s) ? s : "IL";
}

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    const cases = await listCasesForUser({ ctx });
    logger.info("compensation.cases.list", { userId: ctx.userId, count: cases.length });
    return NextResponse.json({ cases });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.list.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    const supabaseAdmin = getSupabaseAdmin();

    const body = (await req.json().catch(() => null)) as CreateCaseBody | null;
    if (!body) return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 400);

    // Accept either:
    // 1) { application: <app>, status?: ..., state_code?: ... }
    // 2) <app> directly (legacy)
    const rawApp =
      typeof body === "object" && body && "application" in body ? (body as any).application : body;

    const application = normalizeApplication(rawApp);
    if (!application) {
      return apiFail("VALIDATION_ERROR", "Invalid application payload (must be JSON object)", undefined, 400);
    }

    const status =
      typeof body === "object" && body && "status" in body
        ? normalizeStatus((body as any).status)
        : "draft";

    const state_code =
      typeof body === "object" && body && "state_code" in body
        ? normalizeStateCode((body as any).state_code)
        : "IL";

    const name =
      typeof body === "object" && body && "name" in body && typeof (body as any).name === "string"
        ? (body as any).name.trim() || null
        : null;

    // 1) Create the case
    const { data: newCase, error: caseError } = await supabaseAdmin
      .from("cases")
      .insert({
        owner_user_id: ctx.userId,
        status,
        state_code,
        name: name ?? undefined,
        application, // IMPORTANT: store as jsonb object (not string)
      })
      .select("*")
      .single();

    if (caseError || !newCase) {
      console.error("Error inserting case", caseError);
      return NextResponse.json(
        { error: "Failed to save case" },
        { status: 500 }
      );
    }

    // 2) Create owner access row
    const { error: accessError } = await supabaseAdmin.from("case_access").insert({
      case_id: newCase.id,
      user_id: ctx.userId,
      role: "owner",
      can_view: true,
      can_edit: true,
    });

    if (accessError) {
      console.error("Error inserting case_access owner row", accessError);
      // do not fail creation
    }

    // 3) Attach any unassigned documents from this user to the new case
    const { error: attachError } = await supabaseAdmin
      .from("documents")
      .update({ case_id: newCase.id })
      .eq("uploaded_by_user_id", ctx.userId)
      .is("case_id", null);

    if (attachError) {
      logger.warn("compensation.cases.create.attach_docs_failed", { caseId: newCase.id });
      return NextResponse.json(
        {
          case: newCase,
          access: { role: "owner", can_view: true, can_edit: true },
          warning:
            "Case saved, but failed to attach some documents. You may need to re-upload them.",
          permissionWarning: accessError ? "Case saved, but permission row failed to create." : null,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        case: newCase,
        access: { role: "owner", can_view: true, can_edit: true },
        permissionWarning: accessError ? "Case saved, but permission row failed to create." : null,
      },
      { status: 201 }
    );
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.create.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}