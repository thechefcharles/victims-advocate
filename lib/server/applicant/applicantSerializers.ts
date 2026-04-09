/**
 * Domain 3.1 — Applicant Domain: serializers.
 *
 * These functions transform DB rows into API response shapes.
 * NONE of these serializers pass through raw personal_info jsonb or internal DB ids.
 * All property names are camelCase.
 */

import type {
  ApplicantProfileRecord,
  ApplicantPreferenceRecord,
  ApplicantBookmarkRecord,
  SerializedApplicantProfile,
  SerializedApplicantPreference,
  SerializedSafetyPreference,
  SerializedApplicantBookmark,
  ApplicantSelfView,
  ApplicantProviderView,
  ApplicantAdminView,
} from "./types";
import type { SafetySettings } from "@/lib/server/safety/types";

// ---------------------------------------------------------------------------
// Profile serializer helpers
// ---------------------------------------------------------------------------

function serializeProfile(profile: ApplicantProfileRecord): SerializedApplicantProfile {
  return {
    userId: profile.user_id,
    preferredName: profile.preferred_name,
    legalFirstName: profile.legal_first_name,
    legalLastName: profile.legal_last_name,
    pronouns: profile.pronouns,
    genderIdentity: profile.gender_identity,
    dateOfBirth: profile.date_of_birth,
    ethnicity: profile.ethnicity,
    race: profile.race,
    streetAddress: profile.street_address,
    apt: profile.apt,
    city: profile.city,
    state: profile.state,
    zip: profile.zip,
    cellPhone: profile.cell_phone,
    alternatePhone: profile.alternate_phone,
    occupation: profile.occupation,
    educationLevel: profile.education_level,
    interpreterNeeded: profile.interpreter_needed,
    preferredContactMethod: profile.preferred_contact_method,
    profileCompletionPct: profile.profile_completion_pct,
  };
}

function serializePreferences(
  pref: ApplicantPreferenceRecord,
): SerializedApplicantPreference {
  return {
    userId: pref.user_id,
    accessibilityMode: pref.accessibility_mode,
    notificationChannelPreference: pref.notification_channel_preference,
    discoverySearchRadiusMiles: pref.discovery_search_radius_miles,
    discoveryDefaultStateCode: pref.discovery_default_state_code,
    intakeSaveFrequencySeconds: pref.intake_save_frequency_seconds,
  };
}

function serializeSafetyPreference(settings: SafetySettings): SerializedSafetyPreference {
  return {
    safetyModeEnabled: settings.safety_mode_enabled,
    hideSensitiveLabels: settings.hide_sensitive_labels,
    suppressNotificationPreviews: settings.suppress_notification_previews,
    clearLocalStateOnQuickExit: settings.clear_local_state_on_quick_exit,
    reducedDashboardVisibility: settings.reduced_dashboard_visibility,
  };
}

function serializeBookmark(b: ApplicantBookmarkRecord): SerializedApplicantBookmark {
  return {
    id: b.id,
    targetType: b.target_type,
    targetId: b.target_id,
    position: b.position,
    notes: b.notes,
    createdAt: b.created_at,
  };
}

// ---------------------------------------------------------------------------
// Public serializers
// ---------------------------------------------------------------------------

/**
 * Self view: full access — profile + preferences + safety + bookmarks.
 * Never passes through raw personal_info jsonb.
 */
export function serializeApplicantSelfView(
  profile: ApplicantProfileRecord | null,
  preferences: ApplicantPreferenceRecord | null,
  safetyPreference: SafetySettings,
  bookmarks: ApplicantBookmarkRecord[],
): ApplicantSelfView {
  const serializedProfile = profile
    ? serializeProfile(profile)
    : ({
        userId: safetyPreference.user_id,
        preferredName: null,
        legalFirstName: null,
        legalLastName: null,
        pronouns: null,
        genderIdentity: null,
        dateOfBirth: null,
        ethnicity: null,
        race: null,
        streetAddress: null,
        apt: null,
        city: null,
        state: null,
        zip: null,
        cellPhone: null,
        alternatePhone: null,
        occupation: null,
        educationLevel: null,
        interpreterNeeded: false,
        preferredContactMethod: null,
        profileCompletionPct: 0,
      } as SerializedApplicantProfile);

  return {
    profile: serializedProfile,
    preferences: preferences ? serializePreferences(preferences) : null,
    safetyPreference: serializeSafetyPreference(safetyPreference),
    bookmarks: bookmarks.map(serializeBookmark),
    profileCompletionPct: profile?.profile_completion_pct ?? 0,
  };
}

/**
 * Provider view: identity + case-relevant fields only.
 * No DOB, no full address, no safety prefs, no bookmarks.
 */
export function serializeApplicantProviderView(
  profile: ApplicantProfileRecord | null,
): ApplicantProviderView {
  return {
    preferredName: profile?.preferred_name ?? null,
    legalFirstName: profile?.legal_first_name ?? null,
    legalLastName: profile?.legal_last_name ?? null,
    pronouns: profile?.pronouns ?? null,
    city: profile?.city ?? null,
    state: profile?.state ?? null,
    preferredContactMethod: profile?.preferred_contact_method ?? null,
    interpreterNeeded: profile?.interpreter_needed ?? false,
  };
}

/**
 * Admin view: superset of self view + audit timestamps.
 * Never passes through raw personal_info jsonb.
 */
export function serializeApplicantAdminView(
  profile: ApplicantProfileRecord | null,
  preferences: ApplicantPreferenceRecord | null,
  safetyPreference: SafetySettings,
  bookmarks: ApplicantBookmarkRecord[],
): ApplicantAdminView {
  const selfView = serializeApplicantSelfView(profile, preferences, safetyPreference, bookmarks);

  return {
    ...selfView,
    userId: safetyPreference.user_id,
    createdAt: profile?.created_at ?? new Date().toISOString(),
    updatedAt: profile?.updated_at ?? new Date().toISOString(),
  };
}
