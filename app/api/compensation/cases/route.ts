// app/api/compensation/cases/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CompensationApplication } from "@/lib/compensationSchema";

type CaseStatus = "draft" | "ready_for_review" | "submitted" | "closed";

type CreateCaseBody =
  | { application: unknown; status?: CaseStatus; state_code?: string }
  | { caseId?: string; application: unknown; status?: CaseStatus; state_code?: string } // tolerated
  | unknown; // legacy: raw application object

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

/**
 * Prevents the "jsonb contains a stringified JSON" problem.
 * Accepts:
 * - object => returns object
 * - JSON string => parses once or twice if needed
 */
function normalizeApplication(raw: unknown): CompensationApplication | null {
  if (!raw) return null;

  // already an object
  if (typeof raw === "object") return raw as CompensationApplication;

  // stringified JSON (possibly double-stringified)
  if (typeof raw === "string") {
    try {
      const once = JSON.parse(raw);
      if (typeof once === "object" && once) return once as CompensationApplication;

      if (typeof once === "string") {
        const twice = JSON.parse(once);
        if (typeof twice === "object" && twice) return twice as CompensationApplication;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeStatus(maybe: unknown): CaseStatus {
  const allowed: CaseStatus[] = ["draft", "ready_for_review", "submitted", "closed"];
  return allowed.includes(maybe as CaseStatus) ? (maybe as CaseStatus) : "draft";
}

function normalizeStateCode(maybe: unknown): string {
  const s = typeof maybe === "string" ? maybe.trim().toUpperCase() : "";
  // MVP: default IL; you can expand later
  return s || "IL";
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const supabaseAdmin = getSupabaseAdmin();

    // Return cases the user can_view via case_access (owner OR advocate)
    const { data, error } = await supabaseAdmin
      .from("case_access")
      .select(
        `
        role,
        can_view,
        can_edit,
        cases:cases ( * )
      `
      )
      .eq("user_id", userId)
      .eq("can_view", true)
      .order("created_at", { ascending: false, foreignTable: "cases" });

    if (error) {
      console.error("Supabase case_access SELECT error:", error);
      return NextResponse.json(
        { error: error.message || "Supabase error" },
        { status: 500 }
      );
    }

    const cases = (data ?? [])
      .map((row: any) => {
        const c = row?.cases;
        if (!c) return null;

        return {
          ...c,
          access: {
            role: row.role,
            can_view: row.can_view,
            can_edit: row.can_edit,
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({ cases });
  } catch (err: any) {
    console.error("Unexpected error in GET /api/compensation/cases:", err);
    const msg = err?.message ?? "Unexpected error";
    return NextResponse.json(
      { error: msg },
      { status: msg.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const supabaseAdmin = getSupabaseAdmin();

    const body = (await req.json().catch(() => null)) as CreateCaseBody | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    // Accept either:
    // 1) { application: <app>, status?: ..., state_code?: ... }
    // 2) <app> directly (legacy)
    const rawApp =
      typeof body === "object" && body && "application" in body ? (body as any).application : body;

    const application = normalizeApplication(rawApp);
    if (!application) {
      return NextResponse.json(
        { error: "Invalid application payload (must be JSON object)" },
        { status: 400 }
      );
    }

    const status =
      typeof body === "object" && body && "status" in body
        ? normalizeStatus((body as any).status)
        : "draft";

    const state_code =
      typeof body === "object" && body && "state_code" in body
        ? normalizeStateCode((body as any).state_code)
        : "IL";

    const name =
      typeof body === "object" && body && "name" in body && typeof (body as any).name === "string"
        ? (body as any).name.trim() || null
        : null;

    // 1) Create the case
    const { data: newCase, error: caseError } = await supabaseAdmin
      .from("cases")
      .insert({
        owner_user_id: userId,
        status,
        state_code,
        name: name ?? undefined,
        application, // IMPORTANT: store as jsonb object (not string)
      })
      .select("*")
      .single();

    if (caseError || !newCase) {
      console.error("Error inserting case", caseError);
      return NextResponse.json(
        { error: "Failed to save case" },
        { status: 500 }
      );
    }

    // 2) Create owner access row
    const { error: accessError } = await supabaseAdmin.from("case_access").insert({
      case_id: newCase.id,
      user_id: userId,
      role: "owner",
      can_view: true,
      can_edit: true,
    });

    if (accessError) {
      console.error("Error inserting case_access owner row", accessError);
      // do not fail creation
    }

    // 3) Attach any unassigned documents from this user to the new case
    const { error: attachError } = await supabaseAdmin
      .from("documents")
      .update({ case_id: newCase.id })
      .eq("uploaded_by_user_id", userId)
      .is("case_id", null);

    if (attachError) {
      console.error("Error attaching documents to case", attachError);
      return NextResponse.json(
        {
          case: newCase,
          access: { role: "owner", can_view: true, can_edit: true },
          warning:
            "Case saved, but failed to attach some documents. You may need to re-upload them.",
          permissionWarning: accessError ? "Case saved, but permission row failed to create." : null,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        case: newCase,
        access: { role: "owner", can_view: true, can_edit: true },
        permissionWarning: accessError ? "Case saved, but permission row failed to create." : null,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error in POST /api/compensation/cases", err);
    const msg = err?.message ?? "Invalid request body";
    return NextResponse.json(
      { error: msg },
      { status: msg.includes("Unauthorized") ? 401 : 400 }
    );
  }
}