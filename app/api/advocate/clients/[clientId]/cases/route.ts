// app/api/advocate/clients/[clientId]/cases/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function getToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function requireUserId(req: Request): Promise<string> {
  const token = getToken(req);
  if (!token) throw new Error("Unauthorized (missing token)");

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized (invalid token)");

  return data.user.id;
}

function parseApp(app: any) {
  if (!app) return null;
  if (typeof app === "string") {
    try {
      return JSON.parse(app);
    } catch {
      return null;
    }
  }
  return app;
}

// ✅ NOTE: params is a Promise in Next.js 16 route handlers
export async function GET(
  req: Request,
  ctx: { params: Promise<{ clientId: string }> }
) {
  try {
    const advocateId = await requireUserId(req);

    const { clientId } = await ctx.params; // ✅ THIS is the fix
    const cleanClientId = String(clientId || "").trim();

    if (!cleanClientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // ✅ Confirm role = advocate
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", advocateId)
      .maybeSingle();

    if ((prof?.role ?? "victim") !== "advocate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ Get cases where this advocate has access AND owner matches clientId
    const { data, error } = await supabaseAdmin
      .from("case_access")
      .select(
        `
        case_id,
        can_view,
        can_edit,
        role,
        cases:cases (
          id,
          owner_user_id,
          created_at,
          status,
          state_code,
          application
        )
      `
      )
      .eq("user_id", advocateId)
      .eq("role", "advocate")
      .eq("can_view", true);

    if (error) {
      console.error("case_access query error:", error);
      return NextResponse.json({ error: "Failed to load cases" }, { status: 500 });
    }

    const rows = (data ?? []).filter(
      (r: any) => r?.cases?.owner_user_id === cleanClientId
    );

    const cases = rows
      .map((r: any) => {
        const c = r.cases;
        return {
          id: c.id,
          created_at: c.created_at,
          status: c.status,
          state_code: c.state_code,
          application: parseApp(c.application),
          access: { can_view: r.can_view, can_edit: r.can_edit },
        };
      })
      .sort((a: any, b: any) =>
        (b.created_at || "").localeCompare(a.created_at || "")
      );

    return NextResponse.json({ cases });
  } catch (err: any) {
    const msg = err?.message || "Unexpected error";
    return NextResponse.json(
      { error: msg },
      { status: msg.includes("Unauthorized") ? 401 : 500 }
    );
  }
}