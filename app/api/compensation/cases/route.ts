import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CompensationApplication } from "@/lib/compensationSchema";

// UPDATED: allow status coming from client
type CaseStatus = "draft" | "ready_for_review" | "submitted" | "closed";

function getToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function requireUserId(req: Request): Promise<string> {
  const token = getToken(req);
  if (!token) throw new Error("Unauthorized (missing token)");

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized (invalid token)");

  return data.user.id;
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("cases")
      .select("*")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase cases SELECT error:", error);
      return NextResponse.json(
        { error: error.message || "Supabase error", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ cases: data ?? [] });
  } catch (err: any) {
    console.error("Unexpected error in GET /api/compensation/cases:", err);
    const msg = err?.message ?? "Unexpected error";
    return NextResponse.json(
      { error: msg },
      { status: msg.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    console.log("[CASES POST] resolved userId =", userId);

    const supabaseAdmin = getSupabaseAdmin();

    // UPDATED: accept either:
    // 1) { application: <app>, status?: "draft"|"ready_for_review"|... }
    // 2) <app> directly (old client calls)
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const application: CompensationApplication = (body?.application ?? body) as CompensationApplication;

    // UPDATED: default draft (this enables “auto create case on load”)
    const status: CaseStatus = (body?.status ?? "draft") as CaseStatus;

    // OPTIONAL (recommended): only allow ready_for_review when explicitly requested
    // (we are NOT hard-blocking here, just ensuring status is one of our allowed values)
    const allowed: CaseStatus[] = ["draft", "ready_for_review", "submitted", "closed"];
    const finalStatus: CaseStatus = allowed.includes(status) ? status : "draft";

    // 1) Create the case
    const { data: newCase, error: caseError } = await supabaseAdmin
      .from("cases")
      .insert({
        owner_user_id: userId,
        status: finalStatus,
        state_code: "IL",
        application, // jsonb is perfect
      })
      .select("*")
      .single();

    if (caseError || !newCase) {
      console.error("Error inserting case", caseError);
      return NextResponse.json(
        { error: "Failed to save case", details: caseError },
        { status: 500 }
      );
    }

    // 2) Create owner access row
    const { error: accessError } = await supabaseAdmin
      .from("case_access")
      .insert({
        case_id: newCase.id,
        user_id: userId,
        role: "owner",
        can_view: true,
        can_edit: true,
      });

    if (accessError) {
      console.error("Error inserting case_access owner row", accessError);
      // do not fail case creation
    }

    // 3) Attach any unassigned documents from this user to the new case
    const { error: attachError } = await supabaseAdmin
      .from("documents")
      .update({ case_id: newCase.id })
      .eq("uploaded_by_user_id", userId)
      .is("case_id", null);

    if (attachError) {
      console.error("Error attaching documents to case", attachError);
      return NextResponse.json(
        {
          case: newCase,
          warning:
            "Case saved, but failed to attach some documents. You may need to re-upload them.",
          permissionWarning: accessError
            ? "Case saved, but permission row failed to create."
            : null,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        case: newCase,
        permissionWarning: accessError
          ? "Case saved, but permission row failed to create."
          : null,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error in POST /api/compensation/cases", err);
    const msg = err?.message ?? "Invalid request body";
    return NextResponse.json(
      { error: msg },
      { status: msg.includes("Unauthorized") ? 401 : 400 }
    );
  }
}