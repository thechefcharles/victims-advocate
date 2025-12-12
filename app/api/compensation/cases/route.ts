import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { CompensationApplication } from "@/lib/compensationSchema";

function getDevUserId() {
  const id = process.env.DEV_SUPABASE_USER_ID;
  if (!id) throw new Error("Missing DEV_SUPABASE_USER_ID");
  return id;
}

export async function GET() {
  try {
    const supabaseServer = getSupabaseServer();
    const DEV_USER_ID = getDevUserId();

    const { data, error } = await supabaseServer
      .from("cases")
      .select("*")
      .eq("owner_user_id", DEV_USER_ID)
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

// POST /api/compensation/cases  → create case + attach docs
export async function POST(req: Request) {
  try {
    const supabaseServer = getSupabaseServer();
    const DEV_USER_ID = getDevUserId();

    const application = (await req.json()) as CompensationApplication;

    // 1) Insert the new case
    const { data: newCase, error: caseError } = await supabaseServer
      .from("cases")
      .insert({
        owner_user_id: DEV_USER_ID,
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

    // 2) Attach any unassigned documents from this user to the new case
    const { error: attachError } = await supabaseServer
      .from("documents")
      .update({ case_id: newCase.id })
      .eq("uploaded_by_user_id", DEV_USER_ID)
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