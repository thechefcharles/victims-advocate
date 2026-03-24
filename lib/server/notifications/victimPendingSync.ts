import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { createNotification } from "@/lib/server/notifications/create";
import { dismissNotification } from "@/lib/server/notifications/query";

/**
 * Keeps victim notifications aligned with advocate_connection_requests:
 * - Backfills missing `victim_connection_request_pending` rows (e.g. requests sent before we created them).
 * - Dismisses stray `advocate_connection_accepted` notifications whose request_id still has status pending (bad state).
 */
export async function syncVictimConnectionNotifications(ctx: AuthContext): Promise<void> {
  if (ctx.role !== "victim") return;

  const supabase = getSupabaseAdmin();

  const { data: pendingRows, error: pendingErr } = await supabase
    .from("advocate_connection_requests")
    .select("id, advocate_user_id, case_id")
    .eq("victim_user_id", ctx.userId)
    .eq("status", "pending");

  if (pendingErr || !pendingRows?.length) {
    return;
  }

  const pendingIds = new Set(pendingRows.map((r) => r.id as string));

  const { data: acceptedNotifs } = await supabase
    .from("notifications")
    .select("id, metadata, status")
    .eq("user_id", ctx.userId)
    .eq("type", "advocate_connection_accepted")
    .neq("status", "dismissed");

  for (const n of acceptedNotifs ?? []) {
    const rid = (n.metadata as Record<string, unknown> | null)?.request_id;
    if (typeof rid === "string" && pendingIds.has(rid)) {
      try {
        await dismissNotification({ notificationId: n.id as string, ctx });
      } catch {
        // best-effort
      }
    }
  }

  const { data: existingPendingNotifs } = await supabase
    .from("notifications")
    .select("id, metadata")
    .eq("user_id", ctx.userId)
    .eq("type", "victim_connection_request_pending");

  const existingRequestIds = new Set<string>();
  for (const row of existingPendingNotifs ?? []) {
    const rid = (row.metadata as Record<string, unknown> | null)?.request_id;
    if (typeof rid === "string") existingRequestIds.add(rid);
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "https://victims-advocate.vercel.app"
  ).replace(/\/$/, "");

  for (const row of pendingRows) {
    const requestId = row.id as string;
    if (existingRequestIds.has(requestId)) continue;

    const advocateUserId = row.advocate_user_id as string;
    const caseId = (row.case_id as string | null) ?? null;

    let advocateEmail = "your advocate";
    try {
      const { data: udata } = await supabase.auth.admin.getUserById(advocateUserId);
      const e = udata?.user?.email;
      if (e) advocateEmail = e;
    } catch {
      // ignore
    }

    const title = "Connection request pending";
    const body = caseId
      ? `You asked to add ${advocateEmail} as an advocate on this case. They will be notified and can accept or decline.`
      : `You asked to connect with ${advocateEmail}. They will be notified and can accept or decline.`;

    const created = await createNotification(
      {
        userId: ctx.userId,
        type: "victim_connection_request_pending",
        title,
        body,
        actionUrl: `${baseUrl}/dashboard`,
        previewSafe: true,
        caseId,
        metadata: {
          request_id: requestId,
          advocate_email: advocateEmail,
          ...(caseId ? { case_id: caseId } : {}),
        },
      },
      null
    );

    if (created) existingRequestIds.add(requestId);
  }
}
