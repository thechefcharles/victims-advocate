// app/api/debug-admin-check/route.ts
// Debug endpoint to check admin status for a user
// Usage: GET /api/debug-admin-check?email=christinanrice@gmail.com
// Requires service role (admin only)

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Provide ?email= parameter" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1) Find user by email via listUsers (no getUserByEmail in API)
    const { data: listData, error: authError } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });
    const user = listData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (authError || !user) {
      return NextResponse.json({
        email,
        found: false,
        error: authError?.message || "User not found in auth.users",
        steps: [
          "1. Check if user exists in Supabase Auth",
          "2. Verify email spelling: " + email,
          "3. User may need to sign up first",
        ],
      });
    }

    const userId = user.id;

    // 2) Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({
        email,
        userId,
        found: true,
        profileExists: false,
        error: profileError?.message || "No profile row found",
        steps: [
          "1. User exists in auth.users but no profile row",
          "2. Run: INSERT INTO public.profiles (id, role, is_admin) VALUES ('" + userId + "', 'victim', false);",
          "3. Then set admin: UPDATE public.profiles SET is_admin = true WHERE id = '" + userId + "';",
        ],
      });
    }

    // 3) Return full status
    return NextResponse.json({
      email,
      userId,
      found: true,
      profileExists: true,
      isAdmin: profile.is_admin === true,
      profile: {
        id: profile.id,
        role: profile.role,
        is_admin: profile.is_admin,
        organization: profile.organization,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
      fixSql: profile.is_admin !== true
        ? `UPDATE public.profiles SET is_admin = true WHERE id = '${userId}';`
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
