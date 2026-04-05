"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getPlatformStatus } from "@/lib/legal/platformLegalConfig";

const HIDE_PREFIXES = [
  "/login",
  "/signup/consent",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/account/delete",
];

const CATEGORY_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "feature_not_working", label: "Feature not working" },
  { value: "confusing_instructions", label: "Confusing instructions" },
  { value: "other", label: "Something else" },
] as const;

/**
 * Pilot/MVP-only persistent feedback entry; hidden in production and until signup consent is complete.
 */
export function PilotProgramFeedbackLauncher() {
  const pathname = usePathname() ?? "";
  const { user, accessToken, legalConsentNextPath } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [message, setMessage] = useState("");
  const [affectsApplication, setAffectsApplication] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const selectId = `${panelId}-category`;
  const messageId = `${panelId}-message`;

  const hiddenByPath = HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const visible =
    getPlatformStatus() !== "production" &&
    !!user &&
    !!accessToken &&
    !legalConsentNextPath &&
    !hiddenByPath;

  const close = useCallback(() => {
    setOpen(false);
    setDone(false);
    setErr(null);
    setCategory("");
    setMessage("");
    setAffectsApplication(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!visible && open) close();
  }, [visible, open, close]);

  const onSubmit = async () => {
    if (!accessToken || !category) return;
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/pilot/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          category,
          message,
          affectsApplication,
          pathname,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.message ?? "Could not send feedback. Please try again.");
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[45] max-w-[min(100vw-2rem,22rem)] sm:bottom-6 sm:left-6">
      <div className="pointer-events-auto rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface-2)] shadow-lg">
        {open ? (
          <div
            id={panelId}
            role="region"
            aria-label="Report a platform issue"
            className="space-y-3 p-4 text-[var(--color-charcoal)]"
          >
            {done ? (
              <p className="text-sm leading-relaxed text-[var(--color-navy)]" role="status">
                Thank you — your feedback helps us improve.
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <label htmlFor={selectId} className="text-sm font-medium text-[var(--color-navy)]">
                    What kind of issue is this?
                  </label>
                  <select
                    id={selectId}
                    className="min-h-[44px] w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-base text-[var(--color-charcoal)]"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="">Choose one…</option>
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor={messageId} className="text-sm font-medium text-[var(--color-navy)]">
                    Tell us what happened (optional)
                  </label>
                  <textarea
                    id={messageId}
                    rows={3}
                    className="w-full resize-y rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-base text-[var(--color-charcoal)]"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <label className="flex min-h-[44px] cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 h-[1.15rem] w-[1.15rem] shrink-0 rounded border-[var(--color-border)]"
                    checked={affectsApplication}
                    onChange={(e) => setAffectsApplication(e.target.checked)}
                  />
                  <span>Is this affecting your application? (optional)</span>
                </label>
                {err ? <p className="text-sm text-red-700">{err}</p> : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[var(--color-teal-deep)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
                    disabled={submitting || !category}
                    onClick={() => void onSubmit()}
                  >
                    Send feedback
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-slate)] hover:bg-[var(--color-warm-cream)]"
                    disabled={submitting}
                    onClick={close}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
            {done ? (
              <button
                type="button"
                className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-slate)] hover:bg-[var(--color-warm-cream)]"
                onClick={close}
              >
                Close
              </button>
            ) : null}
          </div>
        ) : (
          <button
            ref={triggerRef}
            type="button"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-teal-deep)] px-4 text-sm font-semibold text-white shadow-md hover:bg-[var(--color-teal)]"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label="Report a platform issue"
            onClick={() => setOpen(true)}
          >
            Report an issue
          </button>
        )}
      </div>
    </div>
  );
}
