"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const DRAFT_KEY_PREFIX = "nxtstps_compensation_intake_v1_";

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

function getDraftProgress(userId: string) {
  const key = `${DRAFT_KEY_PREFIX}${userId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      step?: IntakeStep;
      maxStepIndex?: number;
    };

    const step = parsed.step ?? "victim";
    const currentIndex = Math.max(0, STEPS.indexOf(step));
    const maxIndex =
      typeof parsed.maxStepIndex === "number"
        ? Math.max(parsed.maxStepIndex, currentIndex)
        : currentIndex;

    return {
      currentIndex,
      maxIndex,
      total: STEPS.length,
      label: step,
    };
  } catch {
    return null;
  }
}

export default function AuthPanel() {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [progress, setProgress] = useState<null | {
    currentIndex: number;
    maxIndex: number;
    total: number;
    label: string;
  }>(null);

  const refreshDraft = (id: string | null) => {
    if (!id) {
      setHasDraft(false);
      setProgress(null);
      return;
    }

    const key = `${DRAFT_KEY_PREFIX}${id}`;
    const exists = !!localStorage.getItem(key);
    setHasDraft(exists);
    setProgress(exists ? getDraftProgress(id) : null);
  };

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      const id = session?.user?.id ?? null;
      const em = session?.user?.email ?? null;

      setUserId(id);
      setEmail(em);
      refreshDraft(id);
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const id = session?.user?.id ?? null;
      const em = session?.user?.email ?? null;

      setUserId(id);
      setEmail(em);
      refreshDraft(id);
    });

    // If another tab updates the draft, reflect it
    const onStorage = (e: StorageEvent) => {
      if (!userId) return;
      if (e.key === `${DRAFT_KEY_PREFIX}${userId}`) {
        refreshDraft(userId);
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const percent =
    progress ? ((progress.maxIndex + 1) / progress.total) * 100 : 0;

  const prettyLabel = (label: string) =>
    label
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 space-y-3">
      {userId ? (
        <>
          <div className="text-[11px] text-slate-400">Signed in as</div>
          <div className="text-sm font-semibold text-slate-100">{email}</div>

          {/* ✅ Personal progress (only when draft exists) */}
          {hasDraft && progress && (
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
            <Link
              href="/compensation/intake"
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                hasDraft
                  ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/25"
                  : "bg-[#1C8C8C] text-slate-950 hover:bg-[#21a3a3]"
              }`}
            >
              {hasDraft ? "Resume application" : "Start application"}
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
        <>
          <div className="text-sm font-semibold text-slate-100">
            Start or resume your application
          </div>
          <div className="text-[11px] text-slate-400">
            You’ll be able to save progress and return later.
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/login"
              className="text-center rounded-lg bg-[#1C8C8C] px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-[#21a3a3]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-center rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-900/60"
            >
              Create account
            </Link>
          </div>

          <p className="text-[11px] text-slate-500 pt-2">
            Not legal advice. If you’re in immediate danger, call 911. If you
            need support now, call or text 988.
          </p>
        </>
      )}
    </div>
  );
}