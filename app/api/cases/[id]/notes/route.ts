/**
 * Domain 1.2 — Case: case notes (stub — full implementation in Domain 1.3+).
 * GET  /api/cases/:id/notes  — view notes (case:note_view)
 * POST /api/cases/:id/notes  — create a note (case:note_create)
 *
 * Policy enforcement is here; persistence is deferred to Domain 1.3.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { getCaseRecordById } from "@/lib/server/cases/caseRepository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const record = await getCaseRecordById(supabase, id);
    if (!record) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    const actor = buildActor(ctx);
    const decision = await can("case:note_view", actor, {
      type: "case",
      id: record.id,
      ownerId: record.owner_user_id,
      tenantId: record.organization_id ?? undefined,
      assignedTo: record.assigned_advocate_id ?? undefined,
      status: record.status,
    });
    if (!decision.allowed) {
      return NextResponse.json({ error: decision.message ?? "Access denied." }, { status: 403 });
    }

    // TODO Domain 1.3: fetch from case_notes table
    return NextResponse.json({ notes: [] });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    if (!body.content?.trim()) {
      return NextResponse.json({ error: "content is required." }, { status: 422 });
    }

    const supabase = getSupabaseAdmin();
    const record = await getCaseRecordById(supabase, id);
    if (!record) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    const actor = buildActor(ctx);
    const decision = await can("case:note_create", actor, {
      type: "case",
      id: record.id,
      ownerId: record.owner_user_id,
      tenantId: record.organization_id ?? undefined,
      assignedTo: record.assigned_advocate_id ?? undefined,
      status: record.status,
    });
    if (!decision.allowed) {
      return NextResponse.json({ error: decision.message ?? "Access denied." }, { status: 403 });
    }

    // TODO Domain 1.3: insert into case_notes table
    return NextResponse.json({ note: { case_id: id, content: body.content } }, { status: 201 });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
