// components/AuthPanel.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";

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

function toTitleFromKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuthPanel() {
  const { loading, user, role } = useAuth();
  const { t, tf } = useI18n();

  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [progress, setProgress] = useState<null | {
    maxIndex: number;
    total: number;
    label: IntakeStep;
  }>(null);

  const userIdRef = useRef<string | null>(null);

  const refresh = (uid: string | null) => {
    if (!uid) {
      setActiveCaseId(null);
      setProgress(null);
      return;
    }

    const activeKey = `${ACTIVE_CASE_KEY_PREFIX}${uid}`;
    let active = safeGetItem(activeKey);

    const progKey = `${PROGRESS_KEY_PREFIX}${uid}`;
    const parsed = safeJsonParse<ProgressPayload>(safeGetItem(progKey));

    if (!active && parsed?.caseId) active = parsed.caseId;

    setActiveCaseId(active ?? null);

    if (!parsed) {
      setProgress(null);
      return;
    }

    const step = (parsed.step ?? "victim") as IntakeStep;
    const currentIndex = Math.max(0, STEPS.indexOf(step));
    const maxIndex =
      typeof parsed.maxStepIndex === "number"
        ? Math.max(parsed.maxStepIndex, currentIndex)
        : currentIndex;

    setProgress({ maxIndex, total: STEPS.length, label: step });
  };

  useEffect(() => {
    const uid = user?.id ?? null;
    userIdRef.current = uid;

    if (role === "advocate") {
      setActiveCaseId(null);
      setProgress(null);
      return;
    }

    refresh(uid);
  }, [user?.id, role]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      const uid = userIdRef.current;
      if (!uid) return;
      if (role === "advocate") return;

      const key1 = `${ACTIVE_CASE_KEY_PREFIX}${uid}`;
      const key2 = `${PROGRESS_KEY_PREFIX}${uid}`;

      if (e.key === key1 || e.key === key2) refresh(uid);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [role]);

  const percent = useMemo(() => {
    return progress ? ((progress.maxIndex + 1) / progress.total) * 100 : 0;
  }, [progress]);

  const email = user?.email ?? null;

  const resumeHref = activeCaseId
    ? `/compensation/intake?case=${activeCaseId}`
    : "/compensation/intake";

  const stepLabel = progress?.label ? toTitleFromKey(progress.label) : "";

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 p-4 sm:p-5">
        <div className="text-[11px] text-[var(--color-muted)]">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 p-4 sm:p-5 space-y-3">
      {user ? (
        role === "advocate" ? (
          <>
            <div className="text-[11px] text-[var(--color-muted)]">
              {t("authPanel.signedInAsAdvocate")}
            </div>
            <div className="text-sm font-semibold text-[var(--color-navy)]">{email}</div>

            <div className="flex flex-wrap gap-2 pt-3">
              <Link
                href="/dashboard"
                className="rounded-full px-4 py-2 text-xs font-semibold bg-[var(--color-teal-deep)] text-white hover:bg-[var(--color-teal)]"
              >
                {t("authPanel.goToMyClients")}
              </Link>

              <Link
                href="/knowledge/compensation"
                className="rounded-full bg-[var(--color-teal-deep)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--color-teal)]"
              >
                {t("authPanel.learnHowItWorks")}
              </Link>
            </div>

            <p className="text-[11px] text-[var(--color-muted)]">{t("authPanel.advocatesNote")}</p>
          </>
        ) : (
          <>
            <div className="text-[11px] text-[var(--color-muted)]">{t("authPanel.signedInAs")}</div>
            <div className="text-sm font-semibold text-[var(--color-navy)]">{email}</div>

            {progress && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[var(--color-muted)]">
                  <span>{t("authPanel.progressTitle")}</span>
                  <span>
                    {tf("authPanel.stepOf", {
                      current: progress.maxIndex + 1,
                      total: progress.total,
                    })}
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-light-sand)]">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="text-[11px] text-[var(--color-muted)]">
                  {t("authPanel.currentSection")}{" "}
                  <span className="text-[var(--color-slate)]">{stepLabel}</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href={resumeHref}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  activeCaseId
                    ? "border border-[var(--color-teal)]/40 bg-blue-950/40 text-blue-100 hover:bg-blue-950/60"
                    : "bg-[var(--color-teal-deep)] text-white hover:bg-[var(--color-teal)]"
                }`}
              >
                {activeCaseId
                  ? t("authPanel.resumeApplication")
                  : t("authPanel.startApplication")}
              </Link>

              <Link
                href="/dashboard"
                className="rounded-full bg-[var(--color-teal-deep)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--color-teal)]"
              >
                {t("authPanel.myCases")}
              </Link>

              <Link
                href="/knowledge/compensation"
                className="rounded-full bg-[var(--color-teal-deep)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--color-teal)]"
              >
                {t("authPanel.learnHowItWorks")}
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
  const { t } = useI18n();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true); // UI-only for now
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

      if (error) setErr(error.message);

      if (!remember) {
        // still UI-only (session persistence is configured in supabaseClient)
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="text-sm font-semibold text-[var(--color-navy)]">
        {t("authPanel.inlineLoginTitle")}
      </div>

      <form onSubmit={handleSignIn} className="space-y-3 pt-1">
        <label className="block space-y-1">
          <span className="text-[11px] text-[var(--color-muted)]">{t("authPanel.emailLabel")}</span>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={t("loginForm.emailPlaceholder")}
            type="email"
            autoComplete="email"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2 text-xs text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] text-[var(--color-muted)]">{t("authPanel.passwordLabel")}</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("loginForm.passwordPlaceholder")}
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2 text-xs text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
          />
        </label>

        <label className="flex items-center gap-2 text-[11px] text-[var(--color-slate)]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-3 w-3"
          />
          {t("authPanel.rememberMe")}
        </label>

        {err && (
          <div className="text-[11px] text-red-300 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !identifier.trim() || !password}
          className="w-full rounded-lg bg-[var(--color-teal-deep)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t("authPanel.signingIn") : t("authPanel.signIn")}
        </button>

        <div className="flex items-start justify-between gap-4 text-[11px] text-[var(--color-muted)]">
          <div className="flex flex-col gap-1">
            <div>
              {t("authPanel.newHere")}{" "}
              <Link href="/signup" className="underline underline-offset-2 hover:text-[var(--color-charcoal)]">
                {t("authPanel.createVictimAccount")}
              </Link>
            </div>
            <div>
              {t("authPanel.workAsAdvocate")}{" "}
              <Link
                href="/signup?intent=advocate"
                className="underline underline-offset-2 hover:text-[var(--color-charcoal)]"
              >
                {t("authPanel.createAdvocateAccount")}
              </Link>
            </div>
          </div>

          <Link href="/help" className="underline underline-offset-2 hover:text-[var(--color-charcoal)]">
            {t("authPanel.needHelp")}
          </Link>
        </div>
      </form>
    </>
  );
}