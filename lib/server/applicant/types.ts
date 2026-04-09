/**
 * Domain 3.1 — Applicant Domain: core types.
 *
 * All property names use camelCase for API shapes.
 * DB row types use snake_case to match table columns.
 */

// ---------------------------------------------------------------------------
// DB row types (snake_case — match table columns)
// ---------------------------------------------------------------------------

export type ApplicantProfileRecord = {
  id: string;
  user_id: string;
  preferred_name: string | null;
  legal_first_name: string | null;
  legal_last_name: string | null;
  pronouns: string | null;
  gender_identity: string | null;
  date_of_birth: string | null;
  ethnicity: string | null;
  race: string | null;
  street_address: string | null;
  apt: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  cell_phone: string | null;
  alternate_phone: string | null;
  occupation: string | null;
  education_level: string | null;
  interpreter_needed: boolean;
  preferred_contact_method: string | null;
  profile_completion_pct: number;
  created_at: string;
  updated_at: string;
};

export type ApplicantPreferenceRecord = {
  id: string;
  user_id: string;
  accessibility_mode: AccessibilityMode;
  notification_channel_preference: NotificationChannelPreference;
  discovery_search_radius_miles: number;
  discovery_default_state_code: string | null;
  intake_save_frequency_seconds: number;
  created_at: string;
  updated_at: string;
};

export type TrustedHelperAccessRecord = {
  id: string;
  applicant_user_id: string;
  helper_user_id: string;
  granted_scope: string[];
  status: TrustedHelperStatus;
  granted_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  granted_by_user_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicantBookmarkRecord = {
  id: string;
  applicant_user_id: string;
  target_type: BookmarkTargetType;
  target_id: string;
  position: number;
  notes: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// String-union type aliases
// ---------------------------------------------------------------------------

export type TrustedHelperStatus = "pending" | "active" | "revoked";

export type TrustedHelperScopeAction =
  | "intake:view"
  | "intake:edit"
  | "documents:upload"
  | "messages:read"
  | "profile:view";

export type BookmarkTargetType = "provider" | "program" | "resource";

export type AccessibilityMode = "high_contrast" | "large_text" | "screen_reader" | "none";

export type NotificationChannelPreference = "email" | "sms" | "in_app";

// ---------------------------------------------------------------------------
// Serialized view shapes (camelCase — API responses)
// ---------------------------------------------------------------------------

export type SerializedApplicantProfile = {
  userId: string;
  preferredName: string | null;
  legalFirstName: string | null;
  legalLastName: string | null;
  pronouns: string | null;
  genderIdentity: string | null;
  dateOfBirth: string | null;
  ethnicity: string | null;
  race: string | null;
  streetAddress: string | null;
  apt: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  cellPhone: string | null;
  alternatePhone: string | null;
  occupation: string | null;
  educationLevel: string | null;
  interpreterNeeded: boolean;
  preferredContactMethod: string | null;
  profileCompletionPct: number;
};

export type SerializedApplicantPreference = {
  userId: string;
  accessibilityMode: AccessibilityMode;
  notificationChannelPreference: NotificationChannelPreference;
  discoverySearchRadiusMiles: number;
  discoveryDefaultStateCode: string | null;
  intakeSaveFrequencySeconds: number;
};

export type SerializedSafetyPreference = {
  safetyModeEnabled: boolean;
  hideSensitiveLabels: boolean;
  suppressNotificationPreviews: boolean;
  clearLocalStateOnQuickExit: boolean;
  reducedDashboardVisibility: boolean;
};

export type SerializedApplicantBookmark = {
  id: string;
  targetType: BookmarkTargetType;
  targetId: string;
  position: number;
  notes: string | null;
  createdAt: string;
};

export type SerializedTrustedHelper = {
  id: string;
  helperUserId: string;
  grantedScope: string[];
  status: TrustedHelperStatus;
  grantedAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  notes: string | null;
};

// ---------------------------------------------------------------------------
// Serialized view aggregates
// ---------------------------------------------------------------------------

/** Returned to the applicant themselves — full access */
export type ApplicantSelfView = {
  profile: SerializedApplicantProfile;
  preferences: SerializedApplicantPreference | null;
  safetyPreference: SerializedSafetyPreference;
  bookmarks: SerializedApplicantBookmark[];
  profileCompletionPct: number;
};

/** Returned to a provider — identity + case-relevant fields only */
export type ApplicantProviderView = {
  preferredName: string | null;
  legalFirstName: string | null;
  legalLastName: string | null;
  pronouns: string | null;
  city: string | null;
  state: string | null;
  preferredContactMethod: string | null;
  interpreterNeeded: boolean;
};

/** Returned to admin — superset of self view */
export type ApplicantAdminView = ApplicantSelfView & {
  createdAt: string;
  updatedAt: string;
  userId: string;
};
