/**
 * Phase 1: Immutable audit logging. Never throws - logs warnings on failure.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import { redact } from "@/lib/server/logging/redact";
import { sha256Hex } from "./hash";
import type { AuthContext } from "@/lib/server/auth";

export type AuditAction =
  | "auth.signup"
  | "auth.login"
  | "auth.logout"
  | "auth.password_reset_requested"
  | "auth.password_reset_completed"
  | "case.view"
  | "document.upload"
  | "document.access"
  | "org.create"
  | "org.update"
  | "org.invite.create"
  | "org.invite.revoke"
  | "org.invite.accept"
  | "org.member.role_change"
  | "org.member.revoke"
  | "policy.create"
  | "policy.activate"
  | "policy.accept"
  | "policy.blocked"
  | "auth.email_verification_required"
  | "auth.email_verification_resent"
  | "auth.email_verified"
  | "auth.login_failed"
  | "auth.locked"
  | "auth.login_rate_limited"
  | "auth.account_disabled"
  | "auth.account_deleted"
  | "auth.access_revoked";

export type AuditSeverity = "info" | "warning" | "security";

export type LogEventParams = {
  ctx: AuthContext | null;
  action: AuditAction;
  resourceType?: string | null;
  resourceId?: string | null;
  organizationId?: string | null;
  severity?: AuditSeverity;
  metadata?: Record<string, unknown>;
  sensitivePayloadForHash?: string | null;
  req?: Request | null;
};

function parseInet(ip: string | null): string | null {
  if (!ip?.trim()) return null;
  const trimmed = ip.trim();
  if (trimmed.length > 45) return null;
  return trimmed;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function asUuidOrNull(v: string | null | undefined): string | null {
  if (!v?.trim()) return null;
  return UUID_REGEX.test(v.trim()) ? v.trim() : null;
}

export async function logEvent(params: LogEventParams): Promise<void> {
  try {
    const {
      ctx,
      action,
      resourceType = null,
      resourceId = null,
      organizationId = null,
      severity = "info",
      metadata = {},
      sensitivePayloadForHash = null,
      req = null,
    } = params;

    const safeMetadata = redact(metadata) as Record<string, unknown>;
    const metadataJson = JSON.stringify(safeMetadata);

    let metadataHash: string | null = null;
    if (sensitivePayloadForHash) {
      try {
        metadataHash = await sha256Hex(sensitivePayloadForHash);
      } catch {
        metadataHash = "[hash_failed]";
      }
    }

    let ip: string | null = null;
    let userAgent: string | null = null;
    if (req) {
      ip = parseInet(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null)
        ?? parseInet(req.headers.get("x-real-ip"))
        ?? null;
      userAgent = req.headers.get("user-agent") ?? null;
    }

    const orgIdVal = organizationId ?? ctx?.orgId;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("audit_log").insert({
      actor_user_id: ctx?.userId ?? null,
      actor_role: ctx?.role ?? null,
      organization_id: asUuidOrNull(String(orgIdVal ?? "")),
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      ip,
      user_agent: userAgent,
      metadata: metadataJson ? (JSON.parse(metadataJson) as object) : {},
      metadata_hash: metadataHash,
      severity,
      is_immutable: true,
    });

    if (error) {
      logger.warn("audit_log_failed", {
        action,
        error: error.message,
        code: error.code,
      });
    }
  } catch (err) {
    logger.warn("audit_log_failed", {
      action: params.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
