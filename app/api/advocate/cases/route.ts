import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function getToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function requireUserId(req: Request): Promise<string | null> {
  const token = getToken(req);
  if (!token) return null;

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user.id;
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1) Find cases this user can view
    const { data: accessRows, error: accessError } = await supabaseAdmin
      .from("case_access")
      .select("case_id, role, can_view, can_edit, created_at")
      .eq("user_id", userId)
      .eq("can_view", true)
      .order("created_at", { ascending: false });

    if (accessError) {
      console.error("case_access select error", accessError);
      return NextResponse.json({ error: "Failed to load access" }, { status: 500 });
    }

    const caseIds = (accessRows ?? []).map((r) => r.case_id);
    if (caseIds.length === 0) {
      return NextResponse.json({ cases: [] });
    }

    // 2) Fetch the cases
    const { data: cases, error: casesError } = await supabaseAdmin
      .from("cases")
      .select("id, owner_user_id, status, state_code, created_at, updated_at, application")
      .in("id", caseIds)
      .order("updated_at", { ascending: false });

    if (casesError) {
      console.error("cases select error", casesError);
      return NextResponse.json({ error: "Failed to load cases" }, { status: 500 });
    }

    // 3) Merge access info into case rows
    const accessMap = new Map((accessRows ?? []).map((r) => [r.case_id, r]));
    const merged = (cases ?? []).map((c) => ({
      ...c,
      access: accessMap.get(c.id) ?? null,
    }));

    return NextResponse.json({ cases: merged });
  } catch (err) {
    console.error("Unexpected error in GET /api/advocate/cases", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}