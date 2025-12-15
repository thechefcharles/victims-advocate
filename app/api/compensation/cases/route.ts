import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseRouteAuth } from "@/lib/supabaseRoute";
import type { CompensationApplication } from "@/lib/compensationSchema";

export async function GET() {
  try {
    const supabaseAuth = getSupabaseRouteAuth();
    const { data: authData } = await supabaseAuth.auth.getUser();

    if (!authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("cases")
      .select("*")
      .eq("owner_user_id", authData.user.id)
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
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = getSupabaseRouteAuth();
    const { data: authData } = await supabaseAuth.auth.getUser();

    if (!authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const application = (await req.json()) as CompensationApplication;

    // 1) Insert the new case owned by THIS victim
    const { data: newCase, error: caseError } = await supabaseAdmin
      .from("cases")
      .insert({
        owner_user_id: authData.user.id,
        status: "ready_for_review",
        state_code: "IL",
        application,
      })
      .select("*")
      .single();

    if (caseError || !newCase) {
      console.error("Error inserting case", caseError);
      return NextResponse.json({ error: "Failed to save case" }, { status: 500 });
    }

    // 2) Attach any unassigned documents from THIS victim to the new case
    const { error: attachError } = await supabaseAdmin
      .from("documents")
      .update({ case_id: newCase.id })
      .eq("uploaded_by_user_id", authData.user.id)
      .is("case_id", null);

    if (attachError) {
      console.error("Error attaching documents to case", attachError);
      return NextResponse.json(
        {
          case: newCase,
          warning:
            "Case saved, but failed to attach some documents. You may need to re-upload them.",
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ case: newCase }, { status: 201 });
  } catch (err: any) {
    console.error("Error in POST /api/compensation/cases", err);
    return NextResponse.json(
      { error: err?.message || "Invalid request body" },
      { status: 400 }
    );
  }
}