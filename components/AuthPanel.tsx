"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

function prettyLabel(label: string) {
  return label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuthPanel() {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [progress, setProgress] = useState<null | {
    maxIndex: number;
    total: number;
    label: string;
  }>(null);

  const refresh = (id: string | null) => {
    if (!id) {
      setActiveCaseId(null);
      setProgress(null);
      return;
    }

    // active case pointer
    const activeKey = `${ACTIVE_CASE_KEY_PREFIX}${id}`;
    const active = localStorage.getItem(activeKey);
    setActiveCaseId(active);

    // progress payload
    const progKey = `${PROGRESS_KEY_PREFIX}${id}`;
    const raw = localStorage.getItem(progKey);
    if (!raw) {
      setProgress(null);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ProgressPayload;

      // fallback: if active case pointer missing but progress has caseId, use it
      if (!active && parsed.caseId) setActiveCaseId(parsed.caseId);

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
    } catch {
      setProgress(null);
    }
  };

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      const id = session?.user?.id ?? null;
      const em = session?.user?.email ?? null;

      setUserId(id);
      setEmail(em);
      refresh(id);
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const id = session?.user?.id ?? null;
      const em = session?.user?.email ?? null;

      setUserId(id);
      setEmail(em);
      refresh(id);
    });

    const onStorage = (e: StorageEvent) => {
      if (!userId) return;
      const key1 = `${ACTIVE_CASE_KEY_PREFIX}${userId}`;
      const key2 = `${PROGRESS_KEY_PREFIX}${userId}`;

      if (e.key && (e.key === key1 || e.key === key2)) {
        refresh(userId);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, [userId]);

  const percent = progress ? ((progress.maxIndex + 1) / progress.total) * 100 : 0;

  const resumeHref = activeCaseId
    ? `/compensation/intake?case=${activeCaseId}`
    : "/compensation/intake";

  const ctaLabel = activeCaseId ? "Resume application" : "Start application";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 space-y-3">
      {userId ? (
        <>
          <div className="text-[11px] text-slate-400">Signed in as</div>
          <div className="text-sm font-semibold text-slate-100">{email}</div>

          {/* Progress bar (only when authed) */}
          {progress && (
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
                <span className="text-slate-300">{prettyLabel(progress.label)}</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href={resumeHref}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                activeCaseId
                  ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/25"
                  : "bg-[#1C8C8C] text-slate-950 hover:bg-[#21a3a3]"
              }`}
            >
              {ctaLabel}
            </Link>

            <Link
              href="/dashboard"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs hover:bg-slate-900/60"
            >
              Dashboard
            </Link>

            <Link
              href="/knowledge/compensation"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs hover:bg-slate-900/60"
            >
              Learn how it works
            </Link>
          </div>
        </>
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

      // Optional: persist preference (Supabase manages session; this is just UI state)
      if (!remember) {
        // If you want "remember me" to actually change persistence, we'd handle that
        // via Supabase client config. For now this is a UI checkbox.
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

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>
            New here?{" "}
            <Link
              href="/signup"
              className="underline underline-offset-2 hover:text-slate-200"
            >
              Create an account
            </Link>
          </span>

          <Link
            href="/help"
            className="underline underline-offset-2 hover:text-slate-200"
          >
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