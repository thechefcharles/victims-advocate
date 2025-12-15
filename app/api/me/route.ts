// app/api/me/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, role, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) {
      console.error("Profile lookup error:", profileErr);
      return NextResponse.json({ error: "Profile lookup failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      userId,
      role: profile?.role ?? "victim",
      profile: profile ?? null,
    });
  } catch (err: any) {
    const msg = err?.message || "Unexpected error";
    return NextResponse.json(
      { error: msg },
      { status: msg.includes("Unauthorized") ? 401 : 500 }
    );
  }
}