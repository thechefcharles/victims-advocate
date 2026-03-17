/**
 * Phase 0: Environment + config sanity checks (fail fast).
 * Validates required env vars when first accessed.
 */

let _validated = false;

function validateEnv() {
  if (_validated) return;

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const;

  const missing = required.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Add them to .env.local and restart the dev server."
    );
  }

  _validated = true;
}

export const config = {
  get supabase() {
    validateEnv();
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    };
  },

  get openaiApiKey() {
    return process.env.OPENAI_API_KEY?.trim() ?? null;
  },

  /** Feature flags (Phase 1+); do not wire heavily in Phase 0. */
  get features() {
    return {
      auditLogging:
        process.env.FEATURE_AUDIT_LOGGING === "true" ||
        process.env.FEATURE_AUDIT_LOGGING === "1",
      multiTenant:
        process.env.FEATURE_MULTI_TENANT === "true" ||
        process.env.FEATURE_MULTI_TENANT === "1",
    };
  },
};

/** Call once at app boot if desired; otherwise first config access triggers validation. */
export function ensureConfig() {
  validateEnv();
}
