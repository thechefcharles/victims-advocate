// app/api/cases/[caseId]/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { CASE_DEFAULTS } from "@/lib/intake/defaults";
import type { CaseData } from "@/lib/intake/types";
import { deepMerge } from "@/lib/intake/merge";
// import { createServerSupabaseClient } from "@/lib/supabase/server"; // <-- your actual import

type Ctx = { params: Promise<{ caseId: string }> };

// This assumes a "cases" table with columns: id (uuid/text), data (jsonb)
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { caseId } = await params;

  // const supabase = await createServerSupabaseClient();
  // const { data, error } = await supabase.from("cases").select("data").eq("id", caseId).single();

  // TEMP placeholder: replace with real DB fetch
  const data = null as any;
  const error = null as any;

  if (error) {
    return NextResponse.json({ error: "Failed to load case" }, { status: 500 });
  }

  const merged: CaseData = deepMerge(CASE_DEFAULTS, (data?.data ?? data) || {});
  return NextResponse.json({ caseId, data: merged });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { caseId } = await params;
  const patch = (await req.json()) as Partial<CaseData>;

  // const supabase = await createServerSupabaseClient();
  // const current = await supabase.from("cases").select("data").eq("id", caseId).single();
  // if (current.error) return NextResponse.json({ error: "Load failed" }, { status: 500 });

  // const nextData = deepMerge(CASE_DEFAULTS, deepMerge(current.data?.data ?? {}, patch));

  // const { error: upErr } = await supabase
  //   .from("cases")
  //   .update({ data: nextData, updated_at: new Date().toISOString() })
  //   .eq("id", caseId);

  const upErr = null as any;

  if (upErr) {
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}