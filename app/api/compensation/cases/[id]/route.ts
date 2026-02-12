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
  const name = body?.name;
  const eligibilityAnswers = body?.eligibility_answers;
  const eligibilityResult = body?.eligibility_result;
  const eligibilityReadiness = body?.eligibility_readiness;

  const hasUpdates =
    application !== undefined ||
    name !== undefined ||
    eligibilityAnswers !== undefined ||
    eligibilityResult !== undefined ||
    eligibilityReadiness !== undefined;

  if (!hasUpdates) {
    return NextResponse.json(
      { error: "Provide application, name, and/or eligibility fields to update" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (application !== undefined) {
    updates.application =
      typeof application === "string" ? application : JSON.stringify(application);
  }
  if (name !== undefined) {
    updates.name = typeof name === "string" ? name.trim() || null : null;
  }
  if (eligibilityAnswers !== undefined) {
    updates.eligibility_answers =
      typeof eligibilityAnswers === "object" && eligibilityAnswers
        ? eligibilityAnswers
        : null;
  }
  if (eligibilityResult !== undefined) {
    const allowed = ["eligible", "needs_review", "not_eligible"];
    updates.eligibility_result =
      typeof eligibilityResult === "string" && allowed.includes(eligibilityResult)
        ? eligibilityResult
        : null;
  }
  if (eligibilityReadiness !== undefined) {
    const allowed = ["ready", "missing_info", "not_ready"];
    updates.eligibility_readiness =
      typeof eligibilityReadiness === "string" &&
      allowed.includes(eligibilityReadiness)
        ? eligibilityReadiness
        : null;
  }
  if (eligibilityAnswers !== undefined || eligibilityResult !== undefined) {
    updates.eligibility_completed_at = new Date().toISOString();
  }

  // ✅ Update case
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("cases")
    .update(updates)
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

export async function DELETE(req: Request, context: RouteParams) {
  const supabaseAdmin = getSupabaseAdmin();
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const userId = await requireUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: accessRow, error: accessError } = await supabaseAdmin
    .from("case_access")
    .select("role, can_edit")
    .eq("case_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (accessError) {
    return NextResponse.json({ error: "Permission lookup failed" }, { status: 500 });
  }

  if (!accessRow?.can_edit || accessRow.role !== "owner") {
    return NextResponse.json(
      { error: "Only the case owner can delete this case" },
      { status: 403 }
    );
  }

  // Delete case_access rows first (if no FK cascade)
  await supabaseAdmin.from("case_access").delete().eq("case_id", id);

  // Delete documents
  await supabaseAdmin.from("documents").delete().eq("case_id", id);

  const { error: deleteError } = await supabaseAdmin
    .from("cases")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", userId);

  if (deleteError) {
    console.error("Case delete error:", deleteError);
    return NextResponse.json({ error: "Failed to delete case" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}