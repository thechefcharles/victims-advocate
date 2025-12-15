"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

const ACTIVE_CASE_KEY_PREFIX = "nxtstps_active_case_";
const PROGRESS_KEY_PREFIX = "nxtstps_intake_progress_";

const STEPS = [
  "victim",
  "applicant",
  "crime",
  "losses",
  "medical",
  "employment",
  "funeral",
  "documents",
  "summary",
] as const;

type IntakeStep = (typeof STEPS)[number];

type ProgressPayload = {
  caseId: string | null;
  step?: IntakeStep;
  maxStepIndex?: number;
  updatedAt?: number;
};

type ProfileRole = "victim" | "advocate";

function prettyLabel(label: string) {
  return label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeGetItem(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export default function AuthPanel() {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<ProfileRole>("victim");

  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [progress, setProgress] = useState<null | {
    maxIndex: number;
    total: number;
    label: string;
  }>(null);

  const userIdRef = useRef<string | null>(null);

  const refresh = useCallback((id: string | null) => {
    if (!id) {
      setActiveCaseId(null);
      setProgress(null);
      return;
    }

    const activeKey = `${ACTIVE_CASE_KEY_PREFIX}${id}`;
    let active: string | null = safeGetItem(activeKey);

    const progKey = `${PROGRESS_KEY_PREFIX}${id}`;
    const parsed = safeJsonParse<ProgressPayload>(safeGetItem(progKey));

    if (!active && parsed?.caseId) active = parsed.caseId;
    setActiveCaseId(active ?? null);

    if (!parsed) {
      setProgress(null);
      return;
    }

    const step = parsed.step ?? "victim";
    const currentIndex = Math.max(0, STEPS.indexOf(step));
    const maxIndex =
      typeof parsed.maxStepIndex === "number"
        ? Math.max(parsed.maxStepIndex, currentIndex)
        : currentIndex;

    setProgress({
      maxIndex,
      total: STEPS.length,
      label: step,
    });
  }, []);

  useEffect(() => {
    let mounted = true;

const loadRole = async (session: any) => {
  const uid = session?.user?.id as string | undefined;
  if (!uid) {
    setRole("victim");
    return;
  }

  // ✅ PRIMARY: auth metadata role (fast + reliable)
  const metaRole = (session.user.user_metadata?.role as ProfileRole) ?? "victim";
  const resolved: ProfileRole = metaRole === "advocate" ? "advocate" : "victim";
  setRole(resolved);

  // ✅ SECONDARY: best-effort confirm from profiles (may fail due to RLS)
  try {
    const { data: prof, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .maybeSingle();

    if (!error && prof?.role) {
      setRole(prof.role === "advocate" ? "advocate" : "victim");
    }
  } catch {
    // ignore
  }
};

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      const id = session?.user?.id ?? null;
      const em = session?.user?.email ?? null;

      if (!mounted) return;

      userIdRef.current = id;
      setUserId(id);
      setEmail(em);

await loadRole(session);

      refresh(id);
      // ✅ If advocate, never show victim progress/start/resume
const metaRole = (session?.user?.user_metadata?.role as ProfileRole) ?? "victim";
if (metaRole === "advocate") {
  setProgress(null);
  setActiveCaseId(null);
}
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const id = session?.user?.id ?? null;
      const em = session?.user?.email ?? null;

      userIdRef.current = id;
      setUserId(id);
      setEmail(em);

await loadRole(session);

      refresh(id);
      // ✅ If advocate, never show victim progress/start/resume
const metaRole = (session?.user?.user_metadata?.role as ProfileRole) ?? "victim";
if (metaRole === "advocate") {
  setProgress(null);
  setActiveCaseId(null);
}
    });

    const onStorage = (e: StorageEvent) => {
      const uid = userIdRef.current;
      if (!uid) return;

      const key1 = `${ACTIVE_CASE_KEY_PREFIX}${uid}`;
      const key2 = `${PROGRESS_KEY_PREFIX}${uid}`;

      if (e.key === key1 || e.key === key2) {
        refresh(uid);
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const percent = useMemo(() => {
    return progress ? ((progress.maxIndex + 1) / progress.total) * 100 : 0;
  }, [progress]);

  const resumeHref = activeCaseId
    ? `/compensation/intake?case=${activeCaseId}`
    : "/compensation/intake";

  const ctaLabel = activeCaseId ? "Resume application" : "Start application";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 space-y-3">
      {userId ? (
        role === "advocate" ? (
          <>
<div className="text-[11px] text-slate-400">
  Signed in as {role === "advocate" ? "Advocate" : "Victim"}
</div>
            <div className="text-sm font-semibold text-slate-100">{email}</div>

            <div className="flex flex-wrap gap-2 pt-3">
              <Link
                href="/dashboard"
                className="rounded-full px-4 py-2 text-xs font-semibold bg-[#1C8C8C] text-slate-950 hover:bg-[#21a3a3]"
              >
                Go to My clients →
              </Link>

              <Link
                href="/knowledge/compensation"
                className="rounded-full border border-slate-600 px-4 py-2 text-xs hover:bg-slate-900/60"
              >
                Learn how it works
              </Link>
            </div>

            <p className="text-[11px] text-slate-500">
              Advocates don’t fill out applications here — victims share cases with you for review.
            </p>
          </>
        ) : (
          <>
            <div className="text-[11px] text-slate-400">Signed in as</div>
            <div className="text-sm font-semibold text-slate-100">{email}</div>

              {role === "victim" && progress && (
                <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Your application progress</span>
                  <span>
                    Step {progress.maxIndex + 1} of {progress.total}
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-[#1C8C8C] to-[#F2C94C]"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="text-[11px] text-slate-500">
                  Current section:{" "}
                  <span className="text-slate-300">
                    {prettyLabel(progress.label)}
                  </span>
                </div>
              </div>
            )}

<div className="flex flex-wrap gap-2 pt-2">
  {role === "victim" ? (
    <>
      <Link
        href={resumeHref}
        className={`rounded-full px-4 py-2 text-xs font-semibold ${
          activeCaseId
            ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/25"
            : "bg-[#1C8C8C] text-slate-950 hover:bg-[#21a3a3]"
        }`}
      >
        {activeCaseId ? "Resume application" : "Start application"}
      </Link>

      <Link
        href="/dashboard"
        className="rounded-full border border-slate-600 px-4 py-2 text-xs hover:bg-slate-900/60"
      >
        My cases
      </Link>
    </>
  ) : (
    <>
      <Link
        href="/dashboard"
        className="rounded-full bg-[#1C8C8C] px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-[#21a3a3]"
      >
        View my clients
      </Link>
    </>
  )}

  <Link
    href="/knowledge/compensation"
    className="rounded-full border border-slate-600 px-4 py-2 text-xs hover:bg-slate-900/60"
  >
    Learn how it works
  </Link>
</div>
          </>
        )
      ) : (
        <InlineLoginCard />
      )}
    </div>
  );
}

function InlineLoginCard() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: identifier.trim(),
        password,
      });

      if (error) {
        setErr(error.message);
        return;
      }

      if (!remember) {
        // UI only for now
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="text-sm font-semibold text-slate-100">
        Let&apos;s get you signed in
      </div>

      <form onSubmit={handleSignIn} className="space-y-3 pt-1">
        <label className="block space-y-1">
          <span className="text-[11px] text-slate-400">Email</span>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] text-slate-400">Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
          />
        </label>

        <label className="flex items-center gap-2 text-[11px] text-slate-300">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-3 w-3"
          />
          Remember me
        </label>

        {err && (
          <div className="text-[11px] text-red-300 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !identifier.trim() || !password}
          className="w-full rounded-lg bg-[#1C8C8C] px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-[#21a3a3] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <div className="flex items-start justify-between gap-4 text-[11px] text-slate-400">
          <div className="flex flex-col gap-1">
            <div>
              New here?{" "}
              <Link href="/signup" className="underline underline-offset-2 hover:text-slate-200">
                Create victim account
              </Link>
            </div>
            <div>
              Work as an advocate?{" "}
              <Link href="/signup/advocate" className="underline underline-offset-2 hover:text-slate-200">
                Create victim advocate account
              </Link>
            </div>
          </div>

          <Link href="/help" className="underline underline-offset-2 hover:text-slate-200">
            Need help?
          </Link>
        </div>

        <p className="text-[11px] text-slate-500">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-slate-300">
            Terms
          </Link>{" "}
          and acknowledge our{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-slate-300">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="text-[11px] text-slate-500">
          Not legal advice. If you&apos;re in immediate danger, call 911. If you need support now, call or text 988.
        </p>
      </form>
    </>
  );
}