import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function getToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function requireUserId(req: Request): Promise<string> {
  const token = getToken(req);
  if (!token) throw new Error("Unauthorized");

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");

  return data.user.id;
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const supabaseAdmin = getSupabaseAdmin();

    // Return cases where user has case_access as advocate
    const { data, error } = await supabaseAdmin
      .from("case_access")
      .select(
        `
        case_id,
        role,
        can_view,
        can_edit,
        created_at,
        cases:case_id (
          id,
          owner_user_id,
          created_at,
          status,
          state_code,
          application
        )
      `
      )
      .eq("user_id", userId)
      .eq("role", "advocate")
      .eq("can_view", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Advocate cases query error:", error);
      return NextResponse.json({ error: "Failed to load advocate cases" }, { status: 500 });
    }

    const cases = (data ?? [])
      .map((row: any) => row.cases)
      .filter(Boolean);

    return NextResponse.json({ cases });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}