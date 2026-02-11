import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from("newsletter_subscribers").insert({
      email: email.toLowerCase(),
      source: body.source ?? "homepage",
    });

    if (error) {
      // Handle duplicate email (unique constraint)
      if (error.code === "23505") {
        return NextResponse.json({ success: true });
      }
      console.error("Newsletter signup error:", error);
      return NextResponse.json(
        { error: "Could not add to newsletter" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Newsletter signup error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
