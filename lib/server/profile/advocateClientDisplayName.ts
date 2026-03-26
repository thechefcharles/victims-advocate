import {
  parsePersonalInfo,
  victimWelcomeDisplayName,
  type VictimPersonalInfo,
} from "@/lib/personalInfo";

function parseApp(app: unknown): Record<string, unknown> | null {
  if (!app) return null;
  if (typeof app === "string") {
    try {
      return JSON.parse(app) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof app === "object") return app as Record<string, unknown>;
  return null;
}

/** Legal first/last from the case intake application (fallback when profile is empty). */
export function nameFromCaseApplication(application: unknown): string | null {
  const app = parseApp(application);
  if (!app) return null;
  const victim = app.victim as Record<string, unknown> | undefined;
  if (!victim) return null;
  const first = String(victim.firstName ?? "").trim();
  const last = String(victim.lastName ?? "").trim();
  const joined = `${first} ${last}`.trim();
  return joined || null;
}

/**
 * Victim label for advocate client lists: account preferred/legal name first,
 * then intake names on the latest shared case, then email local part.
 */
export function buildAdvocateClientDisplayName(params: {
  victimUserId: string;
  personalInfoRaw: unknown;
  applicationFromLatestCase: unknown | null;
  email: string | null;
}): string {
  const pi = parsePersonalInfo(params.personalInfoRaw) as VictimPersonalInfo;
  const fromAccount = victimWelcomeDisplayName(pi);
  if (fromAccount) return fromAccount;

  const fromCase = nameFromCaseApplication(params.applicationFromLatestCase);
  if (fromCase) return fromCase;

  const email = params.email?.trim() ?? "";
  if (email) {
    const local = email.split("@")[0]?.trim();
    if (local) return local;
    return email;
  }

  return `Client ${params.victimUserId.slice(0, 8)}…`;
}
