import { logger } from "@/lib/server/logging";
import { getPrivacyPolicyEmail } from "@/lib/legal/platformLegalConfig";

type Params = {
  toEmail: string;
};

/**
 * Acknowledgment after a standard (non-safety) deletion request. Uses Resend when RESEND_API_KEY is set.
 */
export async function sendDeletionAcknowledgmentEmail({ toEmail }: Params): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "NxtStps <onboarding@resend.dev>";
  const privacy = getPrivacyPolicyEmail();

  const subject = "We received your NxtStps account deletion request";
  const html = `
    <p>Hello,</p>
    <p>We&apos;ve received your request to delete your NxtStps account and associated data. We will process your request within 30 days and send a confirmation when deletion is complete.</p>
    <p>If any information must be retained for legal reasons, we will explain exactly what and why in that confirmation.</p>
    <p>If you have questions, contact us at <a href="mailto:${privacy}">${privacy}</a>.</p>
    <p>— NxtStps Privacy</p>
  `.trim();

  if (!apiKey) {
    logger.info("deletion.ack.email.skipped", { toEmail, reason: "RESEND_API_KEY not configured" });
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error("deletion.ack.email.failed", { status: res.status, body: text.slice(0, 500) });
    return;
  }

  logger.info("deletion.ack.email.sent", { toEmail });
}
