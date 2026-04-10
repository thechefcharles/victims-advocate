/**
 * Domain 7.1 — Governance serializers.
 *
 * All audit event views are READ-ONLY — no edit/update fields.
 * Policy acceptance views are READ-ONLY — immutable after creation.
 */

import type {
  AuditEvent,
  ChangeRequest,
  PolicyAcceptanceV2,
  PolicyDocument,
} from "./governanceTypes";

// ---------------------------------------------------------------------------
// Policy document — public (acceptance flow) + admin
// ---------------------------------------------------------------------------

export interface PublicPolicyView {
  id: string;
  policyType: string;
  version: string;
  title: string;
  content: string;
  publishedAt: string | null;
}

export function serializePolicyForPublic(doc: PolicyDocument): PublicPolicyView {
  return {
    id: doc.id,
    policyType: doc.policyType,
    version: doc.version,
    title: doc.title,
    content: doc.content,
    publishedAt: doc.publishedAt,
  };
}

export function serializePolicyForAdmin(doc: PolicyDocument): PolicyDocument {
  return doc;
}

// ---------------------------------------------------------------------------
// Audit event — read-only, no edit paths
// ---------------------------------------------------------------------------

export interface AuditEventView {
  id: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  eventCategory: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export function serializeAuditEvent(event: AuditEvent): AuditEventView {
  return {
    id: event.id,
    actorId: event.actorId,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    eventCategory: event.eventCategory,
    createdAt: event.createdAt,
    metadata: event.metadata,
  };
}

// ---------------------------------------------------------------------------
// Change request
// ---------------------------------------------------------------------------

export interface ChangeRequestView {
  id: string;
  targetType: string;
  targetId: string;
  status: string;
  reason: string;
  requestedByUserId: string;
  submittedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export function serializeChangeRequest(cr: ChangeRequest): ChangeRequestView {
  return {
    id: cr.id,
    targetType: cr.targetType,
    targetId: cr.targetId,
    status: cr.status,
    reason: cr.reason,
    requestedByUserId: cr.requestedByUserId,
    submittedAt: cr.submittedAt,
    resolvedAt: cr.resolvedAt,
    createdAt: cr.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Policy acceptance — read-only
// ---------------------------------------------------------------------------

export interface PolicyAcceptanceView {
  id: string;
  policyType: string;
  version: string;
  acceptedAt: string;
}

export function serializePolicyAcceptance(
  acc: PolicyAcceptanceV2,
): PolicyAcceptanceView {
  return {
    id: acc.id,
    policyType: acc.policyType,
    version: acc.version,
    acceptedAt: acc.acceptedAt,
  };
}
