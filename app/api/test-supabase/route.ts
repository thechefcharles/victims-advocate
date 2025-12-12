import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabaseServer = getSupabaseServer();

    const { data, error } = await supabaseServer.from("cases").select("*");

    return NextResponse.json({
      success: !error,
      data,
      error,
    });
  } catch (err: any) {
    console.error("GET cases debug route error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}