import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  const cookieStore = await cookies(); // Next 16: cookies() is async

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Next 16 CookieStore: use getAll() if present, otherwise adapt
          // Many builds provide getAll(); if yours doesn't, fallback below.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyStore: any = cookieStore;

          if (typeof anyStore.getAll === "function") return anyStore.getAll();

          // Fallback: if only .get(name) exists, map known supabase cookie names
          const names = [
            "sb-access-token",
            "sb-refresh-token",
            "supabase-auth-token",
          ];

          return names
            .map((name) => {
              const v = cookieStore.get(name)?.value;
              return v ? { name, value: v } : null;
            })
            .filter(Boolean) as { name: string; value: string }[];
        },
        setAll(cookiesToSet) {
          // Route Handlers usually cannot persist Set-Cookie reliably without NextResponse.
          // For this debug endpoint, we don't need to set cookies.
        },
      },
    }
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr) {
    return NextResponse.json({ userErr }, { status: 500 });
  }

  const userId = userData?.user?.id ?? null;

  let profileRow = null;
  let casesRows: any[] = [];

  if (userId) {
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json({ userId, profileErr }, { status: 500 });
    }
    profileRow = profile;

    const { data: cases, error: casesErr } = await supabase
      .from("cases")
      .select("*")
      .eq("owner_user_id", userId)
      .order("updated_at", { ascending: false });

    if (casesErr) {
      return NextResponse.json({ userId, casesErr }, { status: 500 });
    }
    casesRows = cases ?? [];
  }

  return NextResponse.json({ userId, profileRow, casesRows });
}