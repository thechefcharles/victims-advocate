/**
 * Safe hash for sensitive payloads - store hash only, never raw.
 */

export async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    return sha256Subtle(input);
  }
  // Fallback: simple hash for older Node (not cryptographically secure, but better than storing raw)
  let h = 0;
  const s = input + "";
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return "h" + Math.abs(h).toString(16);
}

async function sha256Subtle(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
