// @deprecated — use lib/server/applicant/safetyPreferenceService.ts.
// This file is a re-export shim maintained for back-compat.
// All safety preference logic lives in safetyPreferenceService.ts going forward.
// Existing consumers (AuthContext, notifications, routes) require zero changes.

import type { AuthContext } from "@/lib/server/auth";
import {
  defaultSafetyPreference,
  getSafetyPreference,
  upsertSafetyPreference,
  getSafeNotificationMode as getSafeNotificationModeByUserId,
} from "@/lib/server/applicant/safetyPreferenceService";
import type { SafetySettings, SafeNotificationMode } from "@/lib/server/safety/types";

/** @deprecated use defaultSafetyPreference from lib/server/applicant/safetyPreferenceService.ts */
export const defaultSafetySettings = defaultSafetyPreference;

/** @deprecated use getSafetyPreference from lib/server/applicant/safetyPreferenceService.ts */
export async function getSafetySettings(params: { ctx: AuthContext }): Promise<SafetySettings> {
  return getSafetyPreference(params.ctx.userId);
}

/** @deprecated use upsertSafetyPreference from lib/server/applicant/safetyPreferenceService.ts */
export async function upsertSafetySettings(params: {
  ctx: AuthContext;
  patch: Partial<Omit<SafetySettings, "user_id">>;
}): Promise<SafetySettings> {
  return upsertSafetyPreference(params.ctx.userId, params.patch);
}

/** @deprecated use getSafetyPreference from lib/server/applicant/safetyPreferenceService.ts */
export async function isSafetyModeEnabled(params: { ctx: AuthContext }): Promise<boolean> {
  const settings = await getSafetyPreference(params.ctx.userId);
  return Boolean(settings.safety_mode_enabled);
}

/** @deprecated use getSafeNotificationMode from lib/server/applicant/safetyPreferenceService.ts */
export async function getSafeNotificationMode(params: {
  ctx: AuthContext;
}): Promise<SafeNotificationMode> {
  return getSafeNotificationModeByUserId(params.ctx.userId);
}
