// app/api/compensation/cases/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CompensationApplication } from "@/lib/compensationSchema";

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

    // ✅ Only return cases the user can_view (owner OR advocate)
    const { data, error } = await supabaseAdmin
      .from("case_access")
      .select(
        `
        role,
        can_view,
        can_edit,
        cases:cases ( * )
      `
      )
      .eq("user_id", userId)
      .eq("can_view", true)
      // ✅ correct option name is foreignTable
      .order("created_at", { ascending: false, foreignTable: "cases" });

    if (error) {
      console.error("Supabase case_access SELECT error:", error);
      return NextResponse.json(
        { error: error.message || "Supabase error", details: error },
        { status: 500 }
      );
    }

    const cases = (data ?? [])
      .map((row: any) => {
        const c = row?.cases;
        if (!c) return null;

        return {
          ...c,
          access: {
            role: row.role,
            can_view: row.can_view,
            can_edit: row.can_edit,
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({ cases });
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
    const supabaseAdmin = getSupabaseAdmin();

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    // accept either:
    // 1) { application: <app>, status?: ... }
    // 2) <app> directly (legacy)
    const application: CompensationApplication = (body?.application ?? body) as CompensationApplication;

    const status: CaseStatus = (body?.status ?? "draft") as CaseStatus;
    const allowed: CaseStatus[] = ["draft", "ready_for_review", "submitted", "closed"];
    const finalStatus: CaseStatus = allowed.includes(status) ? status : "draft";

    // 1) Create the case
    const { data: newCase, error: caseError } = await supabaseAdmin
      .from("cases")
      .insert({
        owner_user_id: userId,
        status: finalStatus,
        state_code: "IL",
        application,
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
    const { error: accessError } = await supabaseAdmin.from("case_access").insert({
      case_id: newCase.id,
      user_id: userId,
      role: "owner",
      can_view: true,
      can_edit: true,
    });

    if (accessError) {
      console.error("Error inserting case_access owner row", accessError);
      // don't fail case creation
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
  } catch (err: any) {
    console.error("Error in POST /api/compensation/cases", err);
    const msg = err?.message ?? "Invalid request body";
    return NextResponse.json(
      { error: msg },
      { status: msg.includes("Unauthorized") ? 401 : 400 }
    );
  }
}