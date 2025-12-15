import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";


interface RouteParams {
  params: Promise<{ id: string }>;
}

function getToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function requireUserId(req: Request) {
  const token = getToken(req);
  if (!token) return null;

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user.id;
}

export async function GET(req: Request, context: RouteParams) {
  const supabaseAdmin = getSupabaseAdmin();
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // ✅ Require logged-in user
  const userId = await requireUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ Permission check: must have case_access
  const { data: accessRow, error: accessError } = await supabaseAdmin
    .from("case_access")
    .select("role, can_view, can_edit")
    .eq("case_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (accessError) {
    console.error("case_access lookup error:", accessError);
    return NextResponse.json({ error: "Permission lookup failed" }, { status: 500 });
  }

  if (!accessRow || !accessRow.can_view) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ✅ Fetch the case
  const { data: caseRow, error: caseError } = await supabaseAdmin
    .from("cases")
    .select("*")
    .eq("id", id)
    .single();

  if (caseError || !caseRow) {
    console.error("Supabase case SELECT error:", caseError);
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  // ✅ Fetch documents
  const { data: docs, error: docsError } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("case_id", id)
    .order("created_at", { ascending: false });

  if (docsError) {
    console.error("Supabase documents SELECT error:", docsError);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }

  return NextResponse.json({
    case: caseRow,
    documents: docs ?? [],
    access: accessRow, // 🔥 tells client if edit allowed
  });
}

export async function PATCH(req: Request, context: RouteParams) {
  const supabaseAdmin = getSupabaseAdmin();
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // ✅ Require logged-in user
  const userId = await requireUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ Permission check: must have can_edit
  const { data: accessRow, error: accessError } = await supabaseAdmin
    .from("case_access")
    .select("can_edit")
    .eq("case_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (accessError) {
    console.error("case_access lookup error:", accessError);
    return NextResponse.json({ error: "Permission lookup failed" }, { status: 500 });
  }

  if (!accessRow?.can_edit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ✅ Read body
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const application = body?.application;
  if (!application) {
    return NextResponse.json({ error: "Missing application" }, { status: 400 });
  }

  // ✅ Store consistently (your DB is currently storing stringified JSON)
  const applicationToStore =
    typeof application === "string" ? application : JSON.stringify(application);

  // ✅ Update case
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("cases")
    .update({
      application: applicationToStore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    console.error("Error updating case:", updateError);
    return NextResponse.json(
      { error: "Failed to update case", details: updateError },
      { status: 500 }
    );
  }

  return NextResponse.json({ case: updated });
}