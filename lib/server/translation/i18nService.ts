/**
 * Domain 2.4: Translation / i18n — server-side localized content resolver.
 *
 * Reads the static lib/i18n/en.ts and lib/i18n/es.ts dicts and returns the
 * value for a given dotted key. Mirrors the behavior of the client-side
 * components/i18n/i18nProvider.tsx but is callable from server code.
 *
 * Fallback rules:
 *   1. Look up the key in the requested locale dict
 *   2. If missing, fall back to the en dict
 *   3. If still missing, return the key itself (matches client behavior)
 */

import { en } from "@/lib/i18n/en";
import { es } from "@/lib/i18n/es";
import type { LocaleCode } from "./translationTypes";

function getByPath(obj: unknown, path: string): unknown {
  let cursor: unknown = obj;
  for (const part of path.split(".")) {
    if (cursor == null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

/**
 * Resolves a localized string by dotted key path.
 *
 * Example: resolveLocalizedContent("nav.dashboard", "es") → Spanish value
 * Example: resolveLocalizedContent("nav.dashboard", "en") → English value
 *
 * If the key is missing in the requested locale, falls back to en.
 * If still missing, returns the key string (preserves UI behavior).
 */
export function resolveLocalizedContent(key: string, locale: LocaleCode): string {
  const dict = locale === "es" ? es : en;
  const value = getByPath(dict, key);
  if (typeof value === "string") return value;

  // Fallback to en
  if (locale !== "en") {
    const fallback = getByPath(en, key);
    if (typeof fallback === "string") return fallback;
  }

  // Final fallback: return the key itself
  return key;
}
