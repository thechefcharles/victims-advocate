/**
 * NxtStps 2.0 — Canonical type registry.
 *
 * Single import point for all registry types:
 *   import { CaseStatus, AccountType, ApiErrorCode } from "@/lib/registry"
 *
 * Do not import directly from the sub-files in new code — always go through
 * this index so that future consolidations and re-exports are transparent
 * to import sites.
 */

export type {
  // Workflow status enums (enums.ts)
  SupportRequestStatus,
  CaseStatus,
  MessageThreadStatus,
  IntakeSessionStatus,
  ReferralStatus,
  AppointmentStatus,
  ConsentGrantStatus,
  TrustedHelperStatus,
  ScoreMethodologyStatus,
  ScoreDisputeStatus,
  ProviderAffiliationStatus,
  ChangeRequestStatus,
  AIGuidanceSessionStatus,
  AdvocateCopilotDraftStatus,
} from "./enums";

export type {
  // Auth and identity types (authTypes.ts)
  AccountType,
  ProviderRole,
  AgencyRole,
  MembershipStatus,
  UserAccountStatus,
  SessionContext,
} from "./authTypes";

export type {
  // API surface types (apiTypes.ts)
  ApiErrorCode,
  PolicyDecisionReasonCode,
  VisibilityScope,
  DataClass,
} from "./apiTypes";
