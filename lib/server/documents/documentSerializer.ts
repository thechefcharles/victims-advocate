/**
 * Domain 1.4 — Document serializer.
 *
 * CRITICAL: storage_path must NEVER appear in any output.
 * These are the only functions permitted to produce document API responses.
 */

import type {
  DocumentRecord,
  DocumentApplicantView,
  DocumentProviderView,
  DocumentAdminView,
} from "./documentTypes";
import type { DocumentStatus } from "@/lib/registry";

/** Coerce DB status to the canonical DocumentStatus union (active/locked/archived). */
function toDocumentStatus(status: string): DocumentStatus {
  if (status === "locked") return "locked";
  if (status === "archived") return "archived";
  return "active"; // active, deleted, restricted all surface as "active" to non-admin
}

export function serializeForApplicant(doc: DocumentRecord): DocumentApplicantView {
  return {
    id: doc.id,
    doc_type: doc.doc_type,
    description: doc.description,
    file_name: doc.file_name,
    file_size: doc.file_size,
    mime_type: doc.mime_type,
    status: toDocumentStatus(doc.status),
    created_at: doc.created_at,
    linked_object_type: doc.linked_object_type,
    linked_object_id: doc.linked_object_id,
  };
}

export function serializeForProvider(doc: DocumentRecord): DocumentProviderView {
  return {
    ...serializeForApplicant(doc),
    organization_id: doc.organization_id,
    uploaded_by_user_id: doc.uploaded_by_user_id,
    restriction_reason: doc.restriction_reason,
    locked_at: doc.locked_at,
  };
}

export function serializeForAdmin(doc: DocumentRecord): DocumentAdminView {
  return {
    ...serializeForProvider(doc),
    deleted_at: doc.deleted_at,
    deleted_by: doc.deleted_by,
    restricted_at: doc.restricted_at,
    restricted_by: doc.restricted_by,
    archived_at: doc.archived_at,
  };
}
