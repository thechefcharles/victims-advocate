/**
 * Domain 3.2 — Member and invite serializers.
 * Rule 5: never expose raw DB responses.
 *
 * token_hash must NEVER appear in any serialized response.
 * supervised_by_user_id is internal — excluded from member view.
 */

// ---------------------------------------------------------------------------
// Row types (DB shape)
// ---------------------------------------------------------------------------

export type OrgMembershipRow = {
  id: string;
  user_id: string;
  organization_id: string;
  org_role: string;
  status: string;
  created_at: string;
  created_by?: string | null;
  revoked_at?: string | null;
  revoked_by?: string | null;
  supervised_by_user_id?: string | null;
  [key: string]: unknown;
};

export type OrgInviteRow = {
  id: string;
  organization_id: string;
  email: string;
  org_role: string;
  token_hash: string; // NEVER included in serialized output
  expires_at: string;
  used_at?: string | null;
  used_by?: string | null;
  created_at: string;
  created_by?: string | null;
  revoked_at?: string | null;
  revoked_by?: string | null;
  [key: string]: unknown;
};

export type JoinRequestRow = {
  id: string;
  organization_id: string;
  user_id: string;
  requested_role?: string | null;
  status: string;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  notes?: string | null;
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export type MemberView = {
  id: string;
  user_id: string;
  organization_id: string;
  org_role: string;
  status: string;
  created_at: string;
};

export type InviteView = {
  id: string;
  organization_id: string;
  email: string;
  org_role: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export type JoinRequestView = {
  id: string;
  organization_id: string;
  user_id: string;
  requested_role: string | null;
  status: string;
  created_at: string;
  notes: string | null;
};

// ---------------------------------------------------------------------------
// Serializers (pure functions — no DB calls, no async)
// ---------------------------------------------------------------------------

export function serializeMemberView(row: OrgMembershipRow): MemberView {
  return {
    id: row.id,
    user_id: row.user_id,
    organization_id: row.organization_id,
    org_role: row.org_role,
    status: row.status,
    created_at: row.created_at,
  };
}

export function serializeInviteView(row: OrgInviteRow): InviteView {
  // token_hash intentionally excluded
  return {
    id: row.id,
    organization_id: row.organization_id,
    email: row.email,
    org_role: row.org_role,
    expires_at: row.expires_at,
    used_at: row.used_at ?? null,
    created_at: row.created_at,
  };
}

export function serializeJoinRequestView(row: JoinRequestRow): JoinRequestView {
  return {
    id: row.id,
    organization_id: row.organization_id,
    user_id: row.user_id,
    requested_role: row.requested_role ?? null,
    status: row.status,
    created_at: row.created_at,
    notes: row.notes ?? null,
  };
}
