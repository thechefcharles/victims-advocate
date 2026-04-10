/**
 * Domain 2.4: Translation / i18n — locale preference service.
 *
 * Server-persisted per-user locale. Replaces (or augments) the existing
 * client-only localStorage flow in components/i18n/i18nProvider.tsx.
 *
 * Authenticated users get a server-persisted row in `locale_preferences`.
 * Anonymous users continue to use localStorage on the client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import type { AuthContext } from "@/lib/server/auth/context";
import {
  getLocalePreference as getLocalePrefRow,
  upsertLocalePreference,
} from "./translationRepository";
import type { LocaleCode, LocalePreferenceView } from "./translationTypes";

function denyForbidden(reason?: string): never {
  throw new AppError("FORBIDDEN", reason ?? "Access denied.");
}

export async function getLocalePreference(
  ctx: AuthContext,
  supabase: SupabaseClient,
): Promise<LocalePreferenceView | null> {
  const row = await getLocalePrefRow(supabase, ctx.userId);
  if (!row) return null;
  return { locale: row.locale };
}

export async function updateLocalePreference(
  ctx: AuthContext,
  locale: LocaleCode,
  supabase: SupabaseClient,
): Promise<LocalePreferenceView> {
  const actor = buildActor(ctx);
  const decision = await can("locale_preference:update", actor, {
    type: "locale_preference",
    id: ctx.userId,
    ownerId: ctx.userId,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  const row = await upsertLocalePreference(supabase, ctx.userId, locale);
  return { locale: row.locale };
}
