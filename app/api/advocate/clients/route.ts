// app/api/advocate/clients/route.ts
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

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const supabaseAdmin = getSupabaseAdmin();

    // Confirm role = advocate (optional but recommended)
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if ((prof?.role ?? "victim") !== "advocate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Pull all cases this advocate can view via case_access join
    const { data, error } = await supabaseAdmin
      .from("case_access")
      .select(
        `
        case_id,
        can_view,
        role,
        cases:cases (
          id,
          owner_user_id,
          created_at,
          status,
          application
        )
      `
      )
      .eq("user_id", userId)
      .eq("role", "advocate")
      .eq("can_view", true);

    if (error) {
      console.error("case_access lookup error:", error);
      return NextResponse.json({ error: "Failed to load clients" }, { status: 500 });
    }

    const rows = (data ?? []).filter((r: any) => r.cases);

    // Group by owner_user_id
    const byOwner = new Map<
      string,
      {
        client_user_id: string;
        latest_case_id: string;
        latest_case_created_at: string;
        case_count: number;
        display_name: string;
      }
    >();

    for (const r of rows as any[]) {
      const c = r.cases;
      const ownerId = c.owner_user_id as string;
      const createdAt = c.created_at as string;

      const app = parseApp(c.application);
      const first = app?.victim?.firstName?.trim?.() ?? "";
      const last = app?.victim?.lastName?.trim?.() ?? "";
      const displayName =
        first || last ? `${first} ${last}`.trim() : `Client ${ownerId.slice(0, 8)}…`;

      const existing = byOwner.get(ownerId);

      if (!existing) {
        byOwner.set(ownerId, {
          client_user_id: ownerId,
          latest_case_id: c.id,
          latest_case_created_at: createdAt,
          case_count: 1,
          display_name: displayName,
        });
      } else {
        existing.case_count += 1;

        // update latest
        if (createdAt && existing.latest_case_created_at && createdAt > existing.latest_case_created_at) {
          existing.latest_case_created_at = createdAt;
          existing.latest_case_id = c.id;
          existing.display_name = displayName;
        }
      }
    }

    const clients = Array.from(byOwner.values()).sort((a, b) =>
      (b.latest_case_created_at || "").localeCompare(a.latest_case_created_at || "")
    );

    return NextResponse.json({ clients });
  } catch (err: any) {
    const msg = err?.message || "Unexpected error";
    return NextResponse.json(
      { error: msg },
      { status: msg.includes("Unauthorized") ? 401 : 500 }
    );
  }
}