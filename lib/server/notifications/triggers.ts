import type { AuthContext } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createCaseNotification } from "./create";

export async function notifyNewMessage(params: {
  caseId: string;
  organizationId: string;
  senderId: string;
  senderRole: "victim" | "advocate";
  ctx: AuthContext;
}): Promise<void> {
  const { caseId, organizationId, senderId, senderRole, ctx } = params;
  const supabase = getSupabaseAdmin();

  const { data: caseRow } = await supabase
    .from("cases")
    .select("owner_user_id")
    .eq("id", caseId)
    .maybeSingle();

  const ownerId = (caseRow as any)?.owner_user_id as string | null;

  const { data: accessRows } = await supabase
    .from("case_access")
    .select("user_id, role")
    .eq("case_id", caseId)
    .eq("organization_id", organizationId);

  const advocates =
    accessRows?.filter((r: any) => r.role === "advocate").map((r: any) => r.user_id) ?? [];

  if (senderRole === "victim") {
    const recipients = advocates.filter((id) => id !== senderId);
    if (recipients.length === 0) return;
    await createCaseNotification(
      {
        recipients,
        caseId,
        organizationId,
        type: "message.survivor_to_advocate",
        title: "New secure message on a case",
        body: null,
        actionUrl: `/compensation/intake?case=${caseId}`,
        previewSafe: true,
        metadata: { caseId },
      },
      ctx
    );
  } else if (senderRole === "advocate" && ownerId && ownerId !== senderId) {
    await createCaseNotification(
      {
        recipients: [ownerId],
        caseId,
        organizationId,
        type: "message.advocate_to_survivor",
        title: "New secure message from your advocate",
        body: null,
        actionUrl: `/compensation/intake?case=${caseId}`,
        previewSafe: true,
        metadata: { caseId },
      },
      ctx
    );
  }
}

