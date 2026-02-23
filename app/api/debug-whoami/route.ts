// app/api/debug-whoami/route.ts
// Shows current logged-in user and their admin status

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function getToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export async function GET(req: Request) {
  try {
    const token = getToken(req);
    
    if (!token) {
      return NextResponse.json({
        error: "No token provided",
        hint: "Make sure you're logged in and include Authorization: Bearer <token> header",
      });
    }

    // Get user from token
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json({
        error: "Invalid token",
        details: userError?.message,
      });
    }

    const userId = userData.user.id;
    const email = userData.user.email;

    // Get profile using admin client (bypasses RLS)
    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Also check what the anon client sees (with RLS)
    const { data: profileAnon, error: profileAnonError } = await supabaseAnon
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    return NextResponse.json({
      user: {
        id: userId,
        email: email,
      },
      profile_admin_client: profile || null,
      profile_admin_error: profileError?.message || null,
      profile_anon_client: profileAnon || null,
      profile_anon_error: profileAnonError?.message || null,
      isAdmin_admin: profile?.is_admin === true,
      isAdmin_anon: profileAnon?.is_admin === true,
      rlsIssue: profile && !profileAnon ? "RLS is blocking anon client from reading profile" : null,
      fix: profileAnonError
        ? "Check RLS policies. Ensure: CREATE POLICY \"Users can read own profile\" ON public.profiles FOR SELECT USING (auth.uid() = id);"
        : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || "Unexpected error",
        details: String(err),
      },
      { status: 500 }
    );
  }
}
