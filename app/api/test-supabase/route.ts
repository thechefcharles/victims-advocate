import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const { data, error } = await supabaseServer.from("cases").select("*");

  return NextResponse.json({
    success: !error,
    data,
    error
  });
}