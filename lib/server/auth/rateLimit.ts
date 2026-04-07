/**
 * Phase 5: Login rate limiting and lockout.
 * 5 failed attempts within 15 minutes → lock 15 minutes.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const ACTION_LOGIN = "login_attempt";
const WINDOW_MINUTES = 15;
const MAX_FAILURES = 5;
const LOCKOUT_MINUTES = 15;

function parseInet(ip: string | null): string | null {
  if (!ip?.trim()) return null;
  const t = ip.trim();
  if (t.length > 45) return null;
  return t;
}

export type LockoutResult = {
  locked: boolean;
  lockedUntil: string | null;
}

export async function checkLoginLockout(params: {
  email: string | null;
  ip?: string | null;
  isAdmin?: boolean;
}): Promise<LockoutResult> {
  if (params.isAdmin) return { locked: false, lockedUntil: null };

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const email = params.email?.trim().toLowerCase() ?? null;
  const ip = params.ip != null ? parseInet(String(params.ip)) : null;

  const checks: Promise<LockoutResult>[] = [];

  if (email) {
    checks.push(
      Promise.resolve(
        supabase
          .from("auth_rate_limits")
          .select("locked_until")
          .eq("email", email)
          .eq("action", ACTION_LOGIN)
          .maybeSingle()
      ).then(({ data }) => {
        const lockedUntil = (data as { locked_until?: string | null } | null)?.locked_until ?? null;
        const locked = lockedUntil ? new Date(lockedUntil) > now : false;
        return { locked, lockedUntil: locked ? lockedUntil : null };
      })
    );
  }

  if (ip) {
    checks.push(
      Promise.resolve(
        supabase
          .from("auth_rate_limits")
          .select("locked_until")
          .eq("ip", ip)
          .eq("action", ACTION_LOGIN)
          .maybeSingle()
      ).then(({ data }) => {
        const lockedUntil = (data as { locked_until?: string | null } | null)?.locked_until ?? null;
        const locked = lockedUntil ? new Date(lockedUntil) > now : false;
        return { locked, lockedUntil: locked ? lockedUntil : null };
      })
    );
  }

  if (checks.length === 0) return { locked: false, lockedUntil: null };

  const results = await Promise.all(checks);
  return results.find((r) => r.locked) ?? { locked: false, lockedUntil: null };
}

async function upsertAndIncrement(params: {
  email: string | null;
  ip: string | null;
}): Promise<{ locked: boolean; lockedUntil: string | null }> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const windowMs = WINDOW_MINUTES * 60 * 1000;
  const lockoutMs = LOCKOUT_MINUTES * 60 * 1000;

  const results: { locked: boolean; lockedUntil: string | null }[] = [];

  for (const key of ["email", "ip"] as const) {
    const value = key === "email" ? params.email : params.ip;
    if (value == null) continue;

    const selector =
      key === "email"
        ? supabase.from("auth_rate_limits").select("*").eq("email", params.email!).eq("action", ACTION_LOGIN)
        : supabase.from("auth_rate_limits").select("*").eq("ip", params.ip!).eq("action", ACTION_LOGIN);

    const { data: row } = await selector.maybeSingle();

    const windowStart = row?.window_started_at ? new Date(row.window_started_at) : now;
    const isNewWindow = now.getTime() - windowStart.getTime() > windowMs;
    const failureCount = isNewWindow ? 1 : (row?.failure_count ?? 0) + 1;
    const newWindowStart = isNewWindow ? now : windowStart;
    const locked = failureCount >= MAX_FAILURES;
    const lockedUntil = locked ? new Date(now.getTime() + lockoutMs).toISOString() : null;

    const payload = {
      email: key === "email" ? params.email : null,
      ip: key === "ip" ? params.ip : null,
      action: ACTION_LOGIN,
      failure_count: failureCount,
      window_started_at: newWindowStart.toISOString(),
      locked_until: lockedUntil,
      updated_at: now.toISOString(),
    };

    if (row?.id) {
      await supabase.from("auth_rate_limits").update(payload).eq("id", row.id);
    } else {
      await supabase.from("auth_rate_limits").insert({
        ...payload,
        created_at: now.toISOString(),
      });
    }

    results.push({ locked, lockedUntil });
  }

  const lockedResult = results.find((r) => r.locked);
  return lockedResult ?? { locked: false, lockedUntil: null };
}

export async function recordLoginFailure(params: {
  email: string | null;
  ip?: string | null;
}): Promise<{ locked: boolean; lockedUntil: string | null }> {
  return upsertAndIncrement({
    email: params.email?.trim().toLowerCase() ?? null,
    ip: params.ip != null ? parseInet(String(params.ip)) : null,
  });
}

export async function recordLoginSuccess(params: {
  email: string | null;
  ip?: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const email = params.email?.trim().toLowerCase() ?? null;
  const ip = params.ip != null ? parseInet(String(params.ip)) : null;

  if (email) {
    await supabase
      .from("auth_rate_limits")
      .update({
        failure_count: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email)
      .eq("action", ACTION_LOGIN);
  }
  if (ip) {
    await supabase
      .from("auth_rate_limits")
      .update({
        failure_count: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("ip", ip)
      .eq("action", ACTION_LOGIN);
  }
}
