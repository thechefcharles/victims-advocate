// app/api/cases/[caseId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { CASE_DEFAULTS } from "@/lib/intake/defaults";
import type { CaseData } from "@/lib/intake/types";
import { deepMerge } from "@/lib/intake/merge";

type Params = { params: { caseId: string } };

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-only

  if (!url || !key) {
    throw new Error(
      "Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// This uses a "cases" table with columns: id (text/uuid), data (jsonb), updated_at (timestamptz)
export async function GET(_: Request, { params }: Params) {
  const { caseId } = params;

  try {
    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("cases")
      .select("data")
      .eq("id", caseId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Failed to load case", details: error.message }, { status: 500 });
    }

    const merged: CaseData = deepMerge(CASE_DEFAULTS, (data?.data ?? {}) as any);

    // Optional: auto-create row if it doesn't exist yet
    if (!data) {
      const { error: upErr } = await supabase
        .from("cases")
        .upsert(
          { id: caseId, data: merged, updated_at: new Date().toISOString() },
          { onConflict: "id" }
        );

      if (upErr) {
        // Not fatal for GET; still return merged defaults
        // but useful to see in console
        console.error("Auto-create case failed:", upErr);
      }
    }

    return NextResponse.json({ caseId, data: merged });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const { caseId } = params;

  try {
    const patch = (await req.json()) as Partial<CaseData>;
    const supabase = supabaseAdmin();

    // Load current
    const { data: current, error: loadErr } = await supabase
      .from("cases")
      .select("data")
      .eq("id", caseId)
      .maybeSingle();

    if (loadErr) {
      return NextResponse.json({ error: "Load failed", details: loadErr.message }, { status: 500 });
    }

    // Merge defaults + current + patch (patch wins)
    const base = (current?.data ?? {}) as any;
    const nextData: CaseData = deepMerge(CASE_DEFAULTS, deepMerge(base, patch));

    // Upsert
    const { error: upErr } = await supabase
      .from("cases")
      .upsert(
        { id: caseId, data: nextData, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );

    if (upErr) {
      return NextResponse.json({ error: "Save failed", details: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: nextData });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}