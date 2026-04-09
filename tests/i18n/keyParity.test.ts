/**
 * Domain 2.4: Translation / i18n — key parity gate.
 *
 * CI-gating test: enumerates every leaf key in lib/i18n/en.ts and lib/i18n/es.ts
 * (full dotted path, e.g. "nav.dashboard"), then asserts symmetric difference
 * is empty (modulo a small explicit whitelist).
 *
 * Whitelist policy: keys may appear in this list only with a justification
 * comment. New gaps are NOT allowed — they fail CI until either added to
 * the other dict or explicitly whitelisted.
 */

import { describe, it, expect } from "vitest";
import { en } from "@/lib/i18n/en";
import { es } from "@/lib/i18n/es";

/**
 * Walks an arbitrarily-nested dict and yields every leaf key path as a
 * dotted string. Leaves are anything that is not a plain object (strings,
 * numbers, booleans, arrays).
 */
function leafKeys(obj: unknown, prefix = ""): string[] {
  if (obj === null || obj === undefined) return [];
  if (typeof obj !== "object" || Array.isArray(obj)) return [prefix];
  const out: string[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      out.push(...leafKeys(value, path));
    } else {
      out.push(path);
    }
  }
  return out;
}

/**
 * Whitelist of keys that are intentionally allowed to differ between dicts.
 * Each entry MUST have a comment explaining why. New entries should be rare.
 */
const WHITELISTED_GAPS = new Set<string>([
  // Add justified exceptions here. Empty in v1.
]);

describe("i18n key parity (Domain 2.4)", () => {
  const enKeys = new Set(leafKeys(en));
  const esKeys = new Set(leafKeys(es));

  const missingFromEs = [...enKeys].filter((k) => !esKeys.has(k) && !WHITELISTED_GAPS.has(k));
  const missingFromEn = [...esKeys].filter((k) => !enKeys.has(k) && !WHITELISTED_GAPS.has(k));

  it("every key in en.ts has a counterpart in es.ts", () => {
    if (missingFromEs.length > 0) {
      // Helpful failure message — list the first 20 gaps
      const sample = missingFromEs.slice(0, 20).join("\n  ");
      throw new Error(
        `${missingFromEs.length} keys in en.ts missing from es.ts. First ${Math.min(20, missingFromEs.length)}:\n  ${sample}`,
      );
    }
    expect(missingFromEs).toEqual([]);
  });

  it("every key in es.ts has a counterpart in en.ts", () => {
    if (missingFromEn.length > 0) {
      const sample = missingFromEn.slice(0, 20).join("\n  ");
      throw new Error(
        `${missingFromEn.length} keys in es.ts missing from en.ts. First ${Math.min(20, missingFromEn.length)}:\n  ${sample}`,
      );
    }
    expect(missingFromEn).toEqual([]);
  });

  it("dicts have the same total leaf key count (modulo whitelist)", () => {
    expect(enKeys.size).toBe(esKeys.size);
  });
});
