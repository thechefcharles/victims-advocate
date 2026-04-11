/**
 * Domain 1.4 — Document repository.
 * Pure data access — no business logic. storage_path is accessible here
 * (internal only) but must never be passed to serializers or returned to callers
 * outside documentService.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentRecord, DocumentVersionRecord, UploadDocumentInput } from "./documentTypes";

export async function getDocumentById(
  supabase: SupabaseClient,
  id: string,
): Promise<DocumentRecord | null> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data as DocumentRecord | null;
}

export async function listDocumentsByWorkflow(
  supabase: SupabaseClient,
  linkedObjectType: string,
  linkedObjectId: string,
  filters?: { status?: string },
): Promise<DocumentRecord[]> {
  let query = supabase
    .from("documents")
    .select("*")
    .eq("linked_object_type", linkedObjectType)
    .eq("linked_object_id", linkedObjectId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as DocumentRecord[];
}

export async function listDocumentsByApplicant(
  supabase: SupabaseClient,
  applicantUserId: string,
): Promise<DocumentRecord[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("uploaded_by_user_id", applicantUserId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as DocumentRecord[];
}

export async function listDocumentsByOrganization(
  supabase: SupabaseClient,
  orgId: string,
): Promise<DocumentRecord[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("organization_id", orgId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as DocumentRecord[];
}

export async function insertDocumentRecord(
  supabase: SupabaseClient,
  input: UploadDocumentInput & { storage_path: string; organization_id?: string | null; uploaded_by_user_id: string },
): Promise<DocumentRecord> {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      organization_id: input.organization_id ?? null,
      uploaded_by_user_id: input.uploaded_by_user_id,
      doc_type: input.doc_type,
      file_name: input.file_name,
      file_size: input.file_size ?? null,
      mime_type: input.mime_type ?? null,
      storage_path: input.storage_path,
      status: "active",
      linked_object_type: input.linked_object_type ?? null,
      linked_object_id: input.linked_object_id ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`documents insert failed: ${error.message}`);
  return data as DocumentRecord;
}

export async function updateDocumentRecord(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<DocumentRecord>,
): Promise<DocumentRecord> {
  const { data, error } = await supabase
    .from("documents")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`documents update failed: ${error.message}`);
  return data as DocumentRecord;
}

export async function softDeleteDocumentRecord(
  supabase: SupabaseClient,
  id: string,
  deletedBy: string,
): Promise<DocumentRecord> {
  return updateDocumentRecord(supabase, id, {
    status: "deleted",
    deleted_at: new Date().toISOString(),
    deleted_by: deletedBy,
  } as Partial<DocumentRecord>);
}

export async function lockDocumentRecord(
  supabase: SupabaseClient,
  id: string,
  lockedBy: string,
): Promise<DocumentRecord> {
  return updateDocumentRecord(supabase, id, {
    status: "locked",
    locked_at: new Date().toISOString(),
  } as Partial<DocumentRecord>);
}

export async function insertDocumentVersionRecord(
  supabase: SupabaseClient,
  documentId: string,
  oldData: Pick<DocumentRecord, "storage_path" | "file_name" | "file_size" | "mime_type">,
  versionNumber: number,
  replacedBy: string,
): Promise<DocumentVersionRecord> {
  const { data, error } = await supabase
    .from("document_versions")
    .insert({
      document_id: documentId,
      storage_path: oldData.storage_path,
      file_name: oldData.file_name,
      file_size: oldData.file_size ?? null,
      mime_type: oldData.mime_type ?? null,
      version_number: versionNumber,
      replaced_at: new Date().toISOString(),
      replaced_by: replacedBy,
    })
    .select("*")
    .single();
  if (error) throw new Error(`document_versions insert failed: ${error.message}`);
  return data as DocumentVersionRecord;
}
