/**
 * Domain 1.4 — Documents sub-domain TypeScript types.
 *
 * Data class: A — Restricted.
 * CRITICAL: storage_path must NEVER appear in any view type or API response.
 */

import type { DocumentStatus } from "@nxtstps/registry";

// ---------------------------------------------------------------------------
// DB row shape — internal only, never returned to client
// ---------------------------------------------------------------------------

export interface DocumentRecord {
  id: string;
  case_id: string | null;
  organization_id: string | null;
  uploaded_by_user_id: string;
  doc_type: string;
  description: string | null;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string;          // INTERNAL ONLY — never expose to client
  status: string;                // full DB enum: active | deleted | restricted | locked | archived
  deleted_at: string | null;
  deleted_by: string | null;
  restricted_at: string | null;
  restricted_by: string | null;
  restriction_reason: string | null;
  locked_at: string | null;
  archived_at: string | null;
  linked_object_type: string | null;
  linked_object_id: string | null;
  created_at: string;
}

export interface DocumentVersionRecord {
  id: string;
  document_id: string;
  storage_path: string;           // internal only — version history
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  version_number: number;
  replaced_at: string;
  replaced_by: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Serializer output types — storage_path NEVER present
// ---------------------------------------------------------------------------

export interface DocumentApplicantView {
  id: string;
  doc_type: string;
  description: string | null;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  status: DocumentStatus;
  created_at: string;
  linked_object_type: string | null;
  linked_object_id: string | null;
}

export interface DocumentProviderView extends DocumentApplicantView {
  organization_id: string | null;
  uploaded_by_user_id: string;
  restriction_reason: string | null;
  locked_at: string | null;
}

export interface DocumentAdminView extends DocumentProviderView {
  deleted_at: string | null;
  deleted_by: string | null;
  restricted_at: string | null;
  restricted_by: string | null;
  archived_at: string | null;
}

// ---------------------------------------------------------------------------
// Service I/O types
// ---------------------------------------------------------------------------

export interface UploadDocumentInput {
  linked_object_type?: string;
  linked_object_id?: string;
  doc_type: string;
  file_name: string;
  mime_type?: string | null;
  file_size?: number | null;
}

export interface ReplaceDocumentInput {
  file_name: string;
  mime_type?: string | null;
  file_size?: number | null;
}

export interface ShareDocumentInput {
  recipient_org_id: string;
  purpose: string;
  consent_grant_id?: string;
}

export interface DownloadResult {
  signedUrl: string;
  expiresAt: string;
}
