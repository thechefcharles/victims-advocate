import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function getToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function requireUserId(req: Request): Promise<string | null> {
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

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { caseId, advocateEmail, canEdit } = await req.json();

    const cleanCaseId = String(caseId || "");
    const cleanEmail = String(advocateEmail || "").toLowerCase().trim();
    const allowEdit = Boolean(canEdit);

    if (!cleanCaseId || !cleanEmail) {
      return NextResponse.json(
        { error: "Missing caseId or advocateEmail" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // ✅ caller must be OWNER of the case
    const { data: callerAccess, error: callerErr } = await supabaseAdmin
      .from("case_access")
      .select("role, can_edit")
      .eq("case_id", cleanCaseId)
      .eq("user_id", userId)
      .maybeSingle();

    if (callerErr) {
      console.error("Owner check error:", callerErr);
      return NextResponse.json(
        { error: "Permission check failed" },
        { status: 500 }
      );
    }

    if (!callerAccess || callerAccess.role !== "owner" || !callerAccess.can_edit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ Look up advocate in Supabase Auth (NOT public.users)
    const { data: usersPage, error: listErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (listErr) {
      console.error("auth.admin.listUsers error:", listErr);
      return NextResponse.json({ error: "Advocate lookup failed" }, { status: 500 });
    }

    const match = usersPage?.users?.find(
      (u) => (u.email || "").toLowerCase() === cleanEmail
    );

    if (!match?.id) {
      return NextResponse.json(
        {
          error:
            "No account found for that email. Ask the advocate to create an account first.",
        },
        { status: 404 }
      );
    }

    const advocateUserId = match.id;

    // ✅ grant access (upsert)
    const { error: upsertErr } = await supabaseAdmin
      .from("case_access")
      .upsert(
        {
          case_id: cleanCaseId,
          user_id: advocateUserId,
          role: "advocate",
          can_view: true,
          can_edit: allowEdit,
        },
        { onConflict: "case_id,user_id" }
      );

    if (upsertErr) {
      console.error("case_access upsert error:", upsertErr);
      return NextResponse.json({ error: "Failed to grant access" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      shareUrl: `/compensation/intake?case=${cleanCaseId}`,
      advocateUserId,
      canEdit: allowEdit,
    });
  } catch (err: any) {
    console.error("Invite route error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}