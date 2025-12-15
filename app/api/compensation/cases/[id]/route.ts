import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  const supabaseAdmin = getSupabaseAdmin(); // ✅ create client here (runtime)

  const { id } = await context.params;

  console.log("GET /api/compensation/cases/[id] called with id:", id);

  if (!id) {
    console.error("No id provided to /api/compensation/cases/[id]");
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const { data: caseRow, error: caseError } = await supabaseAdmin
      .from("cases")
      .select("*")
      .eq("id", id)
      .single();

    console.log("Supabase SELECT result for id", id, "->", {
      caseRow,
      caseError,
    });

    if (caseError || !caseRow) {
      console.error("Supabase case SELECT error:", caseError);
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const { data: docs, error: docsError } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("case_id", id)
      .order("created_at", { ascending: false });

    if (docsError) {
      console.error("Supabase documents SELECT error:", docsError);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      case: caseRow,
      documents: docs ?? [],
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/compensation/cases/[id]:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}