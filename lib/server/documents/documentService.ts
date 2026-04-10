/**
 * Domain 1.4 — Document service.
 * Central orchestration. Every mutating function:
 *  1. can() gate → throw FORBIDDEN if denied
 *  2. Status validation
 *  3. Execute operation
 *  4. logEvent() — MANDATORY for every action (SOC 2 gate)
 *  5. emitSignal() where applicable
 *
 * CRITICAL: storage_path is NEVER returned to callers. Use serializers only.
 * Data class: A — Restricted.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";
import { logEvent } from "@/lib/server/audit/logEvent";
import { emitSignal } from "@/lib/server/trustSignal/signalEmitter";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getDocumentById,
  listDocumentsByWorkflow,
  insertDocumentRecord,
  updateDocumentRecord,
  softDeleteDocumentRecord,
  lockDocumentRecord,
  insertDocumentVersionRecord,
} from "./documentRepository";
import {
  serializeForApplicant,
  serializeForProvider,
  serializeForAdmin,
} from "./documentSerializer";
import type {
  DocumentRecord,
  DocumentApplicantView,
  DocumentProviderView,
  DocumentAdminView,
  UploadDocumentInput,
  ReplaceDocumentInput,
  ShareDocumentInput,
  DownloadResult,
} from "./documentTypes";
import { isSharingAllowed } from "@/lib/server/consents/sharingPermissionService";

// 15-minute signed URL expiry for downloads (SOC 2 compliant)
const DOWNLOAD_EXPIRY_SECONDS = 900;

function buildResource(doc: DocumentRecord, actor: PolicyActor) {
  return {
    type: "document" as const,
    id: doc.id,
    ownerId: doc.uploaded_by_user_id,
    tenantId: doc.organization_id,
    status: doc.status,
    assignedTo: undefined as string | undefined,
  };
}

function pickSerializer(
  doc: DocumentRecord,
  actor: PolicyActor,
): DocumentApplicantView | DocumentProviderView | DocumentAdminView {
  if (actor.isAdmin) return serializeForAdmin(doc);
  if (actor.accountType === "provider") return serializeForProvider(doc);
  return serializeForApplicant(doc);
}

// ---------------------------------------------------------------------------
// uploadDocument
// ---------------------------------------------------------------------------

export async function uploadDocument(
  actor: PolicyActor,
  input: UploadDocumentInput & { storage_path: string; organization_id?: string | null },
  supabase: SupabaseClient,
): Promise<DocumentApplicantView> {
  const tempResource = {
    type: "document" as const,
    id: null,
    ownerId: actor.userId,
    tenantId: actor.tenantId,
    status: "active",
  };

  const decision = await can("document:upload", actor, tempResource);
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Document upload denied.", 403);
  }

  const doc = await insertDocumentRecord(supabase, {
    ...input,
    uploaded_by_user_id: actor.userId,
  });

  logEvent({
    ctx: null,
    action: "document.upload",
    resourceType: "document",
    resourceId: doc.id,
    organizationId: doc.organization_id,
    metadata: { doc_type: doc.doc_type, actor_id: actor.userId },
  }).catch(() => {});

  if (actor.tenantId) {
    emitSignal(
      {
        orgId: actor.tenantId,
        signalType: "document_submission_latency",
        value: 0,
        actorUserId: actor.userId,
        actorAccountType: actor.accountType,
        idempotencyKey: `${actor.tenantId}:document_submission_latency:${doc.id}`,
      },
      supabase,
    ).catch(() => {});
  }

  return serializeForApplicant(doc);
}

// ---------------------------------------------------------------------------
// getDocument
// ---------------------------------------------------------------------------

export async function getDocument(
  actor: PolicyActor,
  documentId: string,
  supabase: SupabaseClient,
): Promise<DocumentApplicantView | DocumentProviderView | DocumentAdminView> {
  const doc = await getDocumentById(supabase, documentId);
  if (!doc) throw new AppError("NOT_FOUND", "Document not found.", 404);

  const resource = buildResource(doc, actor);
  const decision = await can("document:view", actor, resource);
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Document access denied.", 403);
  }

  return pickSerializer(doc, actor);
}

// ---------------------------------------------------------------------------
// listWorkflowDocuments
// ---------------------------------------------------------------------------

export async function listWorkflowDocuments(
  actor: PolicyActor,
  linkedObjectType: string,
  linkedObjectId: string,
  supabase: SupabaseClient,
): Promise<(DocumentApplicantView | DocumentProviderView | DocumentAdminView)[]> {
  const tempResource = {
    type: "document" as const,
    id: linkedObjectId,
    ownerId: null as string | null,
    tenantId: actor.tenantId,
    status: "active",
  };

  const decision = await can("document:view", actor, tempResource);
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Document list access denied.", 403);
  }

  const docs = await listDocumentsByWorkflow(supabase, linkedObjectType, linkedObjectId);
  return docs.map((d) => pickSerializer(d, actor));
}

// ---------------------------------------------------------------------------
// replaceDocument
// ---------------------------------------------------------------------------

export async function replaceDocument(
  actor: PolicyActor,
  documentId: string,
  input: ReplaceDocumentInput & { storage_path: string },
  supabase: SupabaseClient,
): Promise<DocumentProviderView> {
  const doc = await getDocumentById(supabase, documentId);
  if (!doc) throw new AppError("NOT_FOUND", "Document not found.", 404);

  const resource = buildResource(doc, actor);
  const decision = await can("document:replace", actor, resource);
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Document replace denied.", 403);
  }

  // Count existing versions for version_number
  const { count } = await (supabase as any)
    .from("document_versions")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId);

  const versionNumber = (count ?? 0) + 1;

  await insertDocumentVersionRecord(
    supabase,
    documentId,
    { storage_path: doc.storage_path, file_name: doc.file_name, file_size: doc.file_size, mime_type: doc.mime_type },
    versionNumber,
    actor.userId,
  );

  const updated = await updateDocumentRecord(supabase, documentId, {
    storage_path: input.storage_path,
    file_name: input.file_name,
    file_size: input.file_size ?? null,
    mime_type: input.mime_type ?? null,
  } as Partial<DocumentRecord>);

  logEvent({
    ctx: null,
    action: "document.replaced",
    resourceType: "document",
    resourceId: documentId,
    organizationId: doc.organization_id,
    metadata: { actor_id: actor.userId, version_number: versionNumber },
  }).catch(() => {});

  logEvent({
    ctx: null,
    action: "document.version_created",
    resourceType: "document",
    resourceId: documentId,
    metadata: { version_number: versionNumber },
  }).catch(() => {});

  return serializeForProvider(updated);
}

// ---------------------------------------------------------------------------
// downloadDocument — SOC 2: NEVER return storage_path, only signed URL
// ---------------------------------------------------------------------------

export async function downloadDocument(
  actor: PolicyActor,
  documentId: string,
  supabase: SupabaseClient,
): Promise<DownloadResult> {
  const doc = await getDocumentById(supabase, documentId);
  if (!doc) throw new AppError("NOT_FOUND", "Document not found.", 404);

  const resource = buildResource(doc, actor);
  const decision = await can("document:download", actor, resource);
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Document download denied.", 403);
  }

  const adminClient = getSupabaseAdmin();
  const { data: signedData, error: signedError } = await adminClient.storage
    .from("case-documents")
    .createSignedUrl(doc.storage_path, DOWNLOAD_EXPIRY_SECONDS);

  if (signedError || !signedData?.signedUrl) {
    throw new AppError("INTERNAL", "Failed to generate download URL.", 500);
  }

  const expiresAt = new Date(Date.now() + DOWNLOAD_EXPIRY_SECONDS * 1000).toISOString();

  logEvent({
    ctx: null,
    action: "document.download",
    resourceType: "document",
    resourceId: documentId,
    organizationId: doc.organization_id,
    severity: "info",
    metadata: { actor_id: actor.userId, expires_at: expiresAt },
  }).catch(() => {});

  return { signedUrl: signedData.signedUrl, expiresAt };
}

// ---------------------------------------------------------------------------
// shareDocument — consent-gated (SOC 2 mandatory)
// ---------------------------------------------------------------------------

export async function shareDocument(
  actor: PolicyActor,
  documentId: string,
  input: ShareDocumentInput,
  supabase: SupabaseClient,
): Promise<DocumentProviderView> {
  const doc = await getDocumentById(supabase, documentId);
  if (!doc) throw new AppError("NOT_FOUND", "Document not found.", 404);

  const resource = buildResource(doc, actor);
  const decision = await can("document:share", actor, resource);
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Document share denied.", 403);
  }

  // MANDATORY: consent gate via isSharingAllowed
  const sharingCheck = await isSharingAllowed(supabase, {
    applicantId: doc.uploaded_by_user_id,
    recipientOrgId: input.recipient_org_id,
    linkedObjectType: doc.linked_object_type ?? "case",
    linkedObjectId: doc.linked_object_id ?? doc.case_id ?? documentId,
    docType: doc.doc_type,
  });

  logEvent({
    ctx: null,
    action: "consent.sharing_checked",
    resourceType: "document",
    resourceId: documentId,
    metadata: {
      allowed: sharingCheck.allowed,
      reason: sharingCheck.reason ?? null,
      recipient_org_id: input.recipient_org_id,
    },
  }).catch(() => {});

  if (!sharingCheck.allowed) {
    throw new AppError(
      "FORBIDDEN",
      `Document sharing denied: ${sharingCheck.reason ?? "no_active_grant"}`,
      403,
    );
  }

  logEvent({
    ctx: null,
    action: "document.shared",
    resourceType: "document",
    resourceId: documentId,
    organizationId: doc.organization_id,
    severity: "info",
    metadata: {
      recipient_org_id: input.recipient_org_id,
      purpose: input.purpose,
      grant_id: sharingCheck.grantId ?? null,
    },
  }).catch(() => {});

  return serializeForProvider(doc);
}

// ---------------------------------------------------------------------------
// softDeleteDocument
// ---------------------------------------------------------------------------

export async function softDeleteDocument(
  actor: PolicyActor,
  documentId: string,
  supabase: SupabaseClient,
): Promise<{ data: { deleted: true }; error: null }> {
  const doc = await getDocumentById(supabase, documentId);
  if (!doc) throw new AppError("NOT_FOUND", "Document not found.", 404);

  const resource = buildResource(doc, actor);
  const decision = await can("document:delete", actor, resource);
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Document delete denied.", 403);
  }

  await softDeleteDocumentRecord(supabase, documentId, actor.userId);

  logEvent({
    ctx: null,
    action: "document.deleted",
    resourceType: "document",
    resourceId: documentId,
    organizationId: doc.organization_id,
    metadata: { actor_id: actor.userId },
  }).catch(() => {});

  return { data: { deleted: true }, error: null };
}

// ---------------------------------------------------------------------------
// lockDocument — SOC 2 mandatory audit
// ---------------------------------------------------------------------------

export async function lockDocument(
  actor: PolicyActor,
  documentId: string,
  supabase: SupabaseClient,
): Promise<DocumentProviderView> {
  const doc = await getDocumentById(supabase, documentId);
  if (!doc) throw new AppError("NOT_FOUND", "Document not found.", 404);

  const resource = buildResource(doc, actor);
  const decision = await can("document:lock", actor, resource);
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Document lock denied.", 403);
  }

  const locked = await lockDocumentRecord(supabase, documentId, actor.userId);

  logEvent({
    ctx: null,
    action: "document.locked",
    resourceType: "document",
    resourceId: documentId,
    organizationId: doc.organization_id,
    severity: "info",
    metadata: { actor_id: actor.userId },
  }).catch(() => {});

  return serializeForProvider(locked);
}

// ---------------------------------------------------------------------------
// attachToMessage — completes Domain 1.3 deferred item
// ---------------------------------------------------------------------------

export async function attachToMessage(
  actor: PolicyActor,
  threadId: string,
  file: {
    storage_path: string;
    file_name: string;
    mime_type: string | null;
    file_size: number | null;
    linked_object_type?: string;
    linked_object_id?: string;
    organization_id?: string | null;
  },
  supabase: SupabaseClient,
): Promise<DocumentApplicantView> {
  const tempResource = {
    type: "message" as const,
    id: threadId,
    ownerId: actor.userId,
    tenantId: actor.tenantId,
    status: "active",
  };

  const decision = await can("message:attachment_upload", actor, tempResource);
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Attachment upload denied.", 403);
  }

  const doc = await insertDocumentRecord(supabase, {
    doc_type: "attachment",
    file_name: file.file_name,
    mime_type: file.mime_type,
    file_size: file.file_size,
    storage_path: file.storage_path,
    organization_id: file.organization_id ?? actor.tenantId,
    uploaded_by_user_id: actor.userId,
    linked_object_type: file.linked_object_type ?? "message_thread",
    linked_object_id: file.linked_object_id ?? threadId,
  });

  logEvent({
    ctx: null,
    action: "document.upload",
    resourceType: "document",
    resourceId: doc.id,
    organizationId: doc.organization_id,
    metadata: { thread_id: threadId, actor_id: actor.userId, source: "attachment" },
  }).catch(() => {});

  return serializeForApplicant(doc);
}
