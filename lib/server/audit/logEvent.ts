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
  | "document.upload_rejected"
  | "document.access"
  | "document.access_requested"
  | "document.access_granted"
  | "document.access_denied"
  | "document.deleted"
  | "document.restricted"
  | "document.unrestricted"
  | "org.create"
  | "org.claim_request.submitted"
  | "org.update"
  | "org.invite.create"
  | "org.invite.revoke"
  | "org.invite.accept"
  | "org.member.role_change"
  | "org.member.revoke"
  | "org.join_request.created"
  | "org.join_request.approved"
  | "org.join_request.declined"
  | "org.rep_join_request.created"
  | "org.rep_join_request.approved"
  | "org.rep_join_request.declined"
  | "org.pending_proposal.created"
  | "admin.org_proposal.approved"
  | "admin.org_proposal.declined"
  | "admin.org_claim_request.approved"
  | "admin.org_claim_request.rejected"
  | "org.profile_updated"
  | "org.profile_status_changed"
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
  | "auth.access_revoked"
  | "case.note_created"
  | "case.note_edited"
  | "case.note_deleted"
  | "case.timeline_viewed"
  | "case.notes_viewed"
  | "case.intake_started"
  | "case.intake_completed"
  | "case.intake_field_deferred"
  | "case.intake_field_skipped"
  | "case.intake_amended"
  | "intake.field_skipped"
  | "intake.field_deferred"
  | "intake.field_amended"
  | "intake.completed"
  | "translator.requested"
  | "translator.completed"
  | "translator.blocked"
  | "knowledge.create"
  | "knowledge.update"
  | "knowledge.activate"
  | "knowledge.archive"
  | "knowledge.search"
  | "routing.program_definition_create"
  | "routing.program_definition_update"
  | "routing.program_definition_activate"
  | "routing.program_definition_archive"
  | "routing.run_started"
  | "routing.run_completed"
  | "routing.run_failed"
  | "completeness.run_started"
  | "completeness.run_completed"
  | "completeness.run_failed"
  | "ocr.run_started"
  | "ocr.run_completed"
  | "ocr.run_failed"
  | "ocr.field_confirmed"
  | "ocr.field_corrected"
  | "ocr.field_rejected"
  | "command_center.viewed"
  | "command_center.search_used"
  | "command_center.filter_used"
  | "message.sent"
  | "message.deleted"
  | "message.thread_viewed"
  | "notification.created"
  | "notification.read"
  | "notification.dismissed"
  | "safety_mode.enabled"
  | "safety_mode.disabled"
  | "safety_mode.updated"
  | "safety_mode.quick_exit"
  | "appointment.created"
  | "appointment.updated"
  | "appointment.cancelled"
  | "appointment.completed"
  | "appointment.rescheduled"
  | "matching.run_started"
  | "matching.run_completed"
  | "matching.run_failed"
  | "grading.run_started"
  | "grading.run_completed"
  | "grading.run_failed"
  | "designation.run_started"
  | "designation.run_completed"
  | "designation.run_failed"
  | "designation.review_submitted"
  | "designation.review_resolved"
  | "designation.review_withdrawn"
  | "ecosystem.viewed"
  | "role_assigned"
  | "role_changed"
  | "member_invited"
  | "member_suspended"
  | "member_removed"
  | "org.permission_denied";

export type AuditSeverity = "info" | "warning" | "security";

export type LogEventParams = {
  ctx: AuthContext | null;
  action: AuditAction;
  resourceType?: string | null;
  resourceId?: string | null;
  organizationId?: string | null;
  /** User affected by membership / role actions (ORG-1B audit_log.target_user_id). */
  targetUserId?: string | null;
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
      targetUserId = null,
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
      target_user_id: asUuidOrNull(targetUserId ?? ""),
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
