"use client";

/**
 * Phase 9: "Explain this" – trigger plain-language explanation of legal/bureaucratic text.
 * Requires AI disclaimer (workflow=translator). Safe logging on server; no raw text stored.
 */

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export type ExplainContextType =
  | "intake_question"
  | "intake_help"
  | "policy_text"
  | "eligibility_guidance"
  | "form_label"
  | "general";

export type ExplainThisProps = {
  sourceText: string;
  contextType?: ExplainContextType;
  workflowKey?: string;
  fieldKey?: string | null;
  programKey?: string | null;
  stateCode?: string | null;
  /** Button label; default "Explain this" */
  label?: string;
  /** Optional class for the trigger button */
  className?: string;
  /** Render as inline link vs button */
  variant?: "button" | "link";
};

type ExplainState = "idle" | "loading" | "success" | "error";

export function ExplainThisButton({
  sourceText,
  contextType = "general",
  workflowKey = "translator",
  fieldKey = null,
  programKey = null,
  stateCode = null,
  label = "Explain this",
  className = "",
  variant = "button",
}: ExplainThisProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ExplainState>("idle");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchExplanation = useCallback(async () => {
    const text = (sourceText ?? "").trim();
    if (!text) return;

    setOpen(true);
    setState("loading");
    setExplanation(null);
    setDisclaimer(null);
    setErrorMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sourceText: text,
          contextType,
          workflowKey,
          fieldKey,
          programKey,
          stateCode,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 403 && json?.error?.code === "CONSENT_REQUIRED") {
        const redirect = encodeURIComponent(pathname ?? "/");
        router.replace(`/consent?workflow=translator&redirect=${redirect}`);
        setOpen(false);
        return;
      }

      if (!res.ok) {
        setState("error");
        setErrorMessage(json?.error?.message ?? json?.message ?? "Something went wrong.");
        return;
      }

      if (json?.ok && json?.data) {
        setExplanation(json.data.explanation ?? "");
        setDisclaimer(json.data.disclaimer ?? null);
        setState("success");
      } else {
        setState("error");
        setErrorMessage("Could not get an explanation.");
      }
    } catch (err) {
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }, [sourceText, contextType, workflowKey, fieldKey, programKey, stateCode, router, pathname]);

  const triggerClass =
    variant === "link"
      ? "text-[var(--color-muted)] hover:text-emerald-300 underline underline-offset-1 text-[11px]"
      : "text-[11px] rounded border border-[var(--color-border)] bg-[var(--color-light-sand)]/85 px-2 py-1 text-[var(--color-slate)] hover:bg-[var(--color-teal-deep)] hover:text-[var(--color-navy)] transition";

  return (
    <>
      <button
        type="button"
        onClick={fetchExplanation}
        className={`${triggerClass} ${className}`.trim()}
        aria-label={label}
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-label="Explanation"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white border border-[var(--color-border)] rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
              <span className="text-sm font-medium text-[var(--color-charcoal)]">Explanation</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--color-muted)] hover:text-[var(--color-charcoal)] p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto text-sm text-[var(--color-slate)] space-y-3">
              {state === "loading" && (
                <p className="text-[var(--color-muted)]">Getting a plain-language explanation…</p>
              )}
              {state === "success" && explanation && (
                <>
                  <p className="whitespace-pre-wrap">{explanation}</p>
                  {disclaimer && (
                    <p className="text-[11px] text-[var(--color-muted)] border-t border-[var(--color-border-light)] pt-2 mt-2">
                      {disclaimer}
                    </p>
                  )}
                </>
              )}
              {state === "error" && (
                <p className="text-amber-200">{errorMessage ?? "Something went wrong."}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
