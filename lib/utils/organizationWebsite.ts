/**
 * Normalize optional org website for storage and links.
 * Browsers reject `type="url"` without a scheme; users often enter "example.org".
 */
export function normalizeOrganizationWebsite(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s.replace(/^\/+/, "")}`;
}
