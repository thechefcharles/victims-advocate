"use client";

import type { FunnelStepId, FunnelSteps, FunnelStepState } from "@/lib/applicantDashboardFunnel";

const ORDER: FunnelStepId[] = ["eligibility", "application", "support"];

export type ApplicantFunnelStepperProps = {
  steps: FunnelSteps;
  labels: Record<FunnelStepId, string>;
  ariaLabel: string;
  /** e.g. "Your progress" — hidden when variant is minimal */
  title: string;
  /** `minimal` = compact strip (dashboard) */
  variant?: "default" | "minimal";
  onStepClick?: (step: FunnelStepId) => void;
  /** If set, a step is only clickable when this returns true (sequential flow). */
  canClickStep?: (step: FunnelStepId) => boolean;
  stepsDisabled?: boolean;
  stepHint?: string;
  /** Eligibility was skipped — outer card can show a red warning frame */
  eligibilitySkipped?: boolean;
};

function segmentClass(state: FunnelStepState, minimal: boolean): string {
  const h = minimal ? "h-3 sm:h-3.5" : "h-3 sm:h-3.5";
  const base = `relative flex-1 overflow-hidden rounded-full ${h} transition-all duration-500`;
  switch (state) {
    case "skipped":
      return `${base} bg-gradient-to-r from-red-900/85 via-red-800/70 to-red-900/80 shadow-[0_0_14px_rgba(239,68,68,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-red-500/45`;
    case "complete":
      return `${base} bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600 shadow-[0_0_18px_rgba(52,211,153,0.45),0_0_28px_rgba(16,185,129,0.2),inset_0_1px_0_rgba(255,255,255,0.35)] ring-1 ring-emerald-300/70`;
    case "current":
      return `${base} bg-gradient-to-r from-[var(--color-teal-light)] via-[var(--color-teal)] to-[var(--color-teal-deep)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ring-1 ring-[var(--color-teal-soft)]/50`;
    case "pending":
      return `${base} border border-dashed border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 shadow-[inset_0_1px_4px_rgba(15,40,64,0.06)]`;
    default:
      return `${base} border border-dashed border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 shadow-[inset_0_1px_4px_rgba(15,40,64,0.06)]`;
  }
}

export function ApplicantFunnelStepper({
  steps,
  labels,
  ariaLabel,
  title,
  variant = "default",
  onStepClick,
  canClickStep,
  stepsDisabled,
  stepHint,
  eligibilitySkipped = false,
}: ApplicantFunnelStepperProps) {
  const doneCount = ORDER.filter((id) => steps[id] === "complete").length;
  const interactive = Boolean(onStepClick) && !stepsDisabled;
  const stepAllowed = (id: FunnelStepId) => (canClickStep ? canClickStep(id) : true);
  const minimal = variant === "minimal";

  const SegmentBar = () => (
    <div
      className={`flex w-full gap-1 ${eligibilitySkipped ? "rounded-lg p-0.5 ring-1 ring-red-500/35 shadow-[0_0_20px_-4px_rgba(239,68,68,0.25)]" : ""}`}
      aria-hidden
    >
      {ORDER.map((id) => {
        const st = steps[id];
        return (
          <div key={id} className={segmentClass(st, minimal)}>
            {st === "complete" ? (
              <div className="pointer-events-none absolute inset-y-0 left-0 w-[min(70%,6rem)] bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-90 mix-blend-overlay funnel-progress-fill-shimmer" />
            ) : null}
          </div>
        );
      })}
    </div>
  );

  if (minimal) {
    return (
      <nav aria-label={ariaLabel} className="w-full">
        <SegmentBar />
        <ol className="mt-2 grid grid-cols-3 gap-1.5">
          {ORDER.map((id, index) => {
            const state = steps[id];
            const label = labels[id];
            const clickable =
              interactive &&
              (id === "eligibility" || id === "application" || id === "support") &&
              stepAllowed(id);
            const active = state === "current";
            const done = state === "complete";
            const skipped = state === "skipped";
            const pending = state === "pending";
            const pill =
              skipped
                ? "border-red-500/55 bg-red-950/45 text-red-200/95 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                : done
                  ? "border-emerald-200/90 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_0_14px_rgba(52,211,153,0.45)] ring-1 ring-emerald-300/60"
                    : active
                    ? "border-0 bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_4px_16px_rgba(59,130,246,0.5)] ring-2 ring-blue-400/60 hover:from-blue-400 hover:to-blue-500 hover:shadow-[0_6px_22px_rgba(59,130,246,0.55)] active:scale-[0.97] transition-[transform,box-shadow]"
                    : pending
                      ? "border-dashed border-[var(--color-muted)]/65 bg-[var(--color-warm-cream)]/95 text-[var(--color-muted)]"
                      : "border-dashed border-[var(--color-border)]/50 bg-[var(--color-warm-cream)]/90 text-[var(--color-muted)]";
            const short = label.replace(/^\d+\.\s*/, "");
            const Inner = (
              <span className="flex flex-col items-center gap-1 text-center">
                <span
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold leading-none ${pill}`}
                >
                  {skipped ? "!" : done ? "✓" : index + 1}
                </span>
                <span
                  className={`line-clamp-2 text-[11px] font-semibold leading-snug sm:text-xs ${
                    skipped
                      ? "text-red-300/90"
                      : done
                        ? "text-emerald-200 font-semibold"
                        : active
                          ? "text-blue-100 font-semibold"
                          : "text-[var(--color-muted)]"
                  }`}
                >
                  {short}
                </span>
              </span>
            );
            return (
              <li key={id} className="min-w-0">
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => onStepClick?.(id)}
                    className={`w-full rounded-lg px-0.5 py-1 transition hover:bg-[var(--color-warm-cream)]/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 ${active ? "ring-2 ring-[var(--color-teal)]/35" : ""} ${skipped ? "ring-1 ring-red-500/25" : ""}`}
                  >
                    {Inner}
                  </button>
                ) : (
                  <div
                    className={`rounded-lg px-0.5 py-1 ${active ? "ring-1 ring-[var(--color-border)]/30" : ""} ${skipped ? "ring-1 ring-red-500/20" : ""}`}
                  >
                    {Inner}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label={ariaLabel} className="w-full space-y-3">
      <div className="flex items-end justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">{title}</p>
        <p className="text-xs font-medium text-[var(--color-muted)] tabular-nums">
          {doneCount}/3 {doneCount === 3 ? "✓" : ""}
        </p>
      </div>
      <SegmentBar />
      {stepHint ? (
        <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">{stepHint}</p>
      ) : null}
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        {ORDER.map((id, index) => {
          const state = steps[id];
          const label = labels[id];
          const skipped = state === "skipped";

          const surface = skipped
            ? "border-red-500/45 bg-red-950/25 shadow-[0_0_0_1px_rgba(239,68,68,0.15)]"
            : state === "current"
              ? "border-[var(--color-teal)]/50 bg-white/95 shadow-[0_0_20px_-4px_rgba(59,130,246,0.35)] ring-1 ring-[var(--color-teal)]/30"
              : state === "complete"
                ? "border-emerald-400/50 bg-emerald-500/15 shadow-[0_0_24px_-6px_rgba(52,211,153,0.35),0_0_0_1px_rgba(52,211,153,0.2)]"
                : "border-dashed border-[var(--color-border)]/70 bg-[var(--color-warm-cream)]/75 opacity-95";

          const badge = skipped
            ? "border-red-400/70 bg-red-600/25 text-red-100"
            : state === "complete"
              ? "border-emerald-200/80 bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-[0_0_12px_rgba(52,211,153,0.4)]"
              : state === "current"
                ? "border-0 bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_4px_14px_rgba(59,130,246,0.45)] ring-2 ring-blue-400/50"
                : "border-dashed border-[var(--color-muted)] bg-[var(--color-warm-cream)]/90 text-[var(--color-muted)]";

          const clickable =
            interactive &&
            (id === "eligibility" || id === "application" || id === "support") &&
            stepAllowed(id);

          const Inner = (
            <div className="flex items-start gap-2.5 sm:flex-col sm:items-center sm:text-center sm:gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${badge}`}
                aria-current={state === "current" ? "step" : undefined}
              >
                {skipped ? "!" : state === "complete" ? "✓" : index + 1}
              </span>
              <span
                className={`text-[11px] font-medium leading-snug ${
                  skipped
                    ? "text-red-200/90"
                      : state === "complete"
                      ? "text-emerald-100 font-semibold"
                      : state === "current"
                        ? "text-blue-100 font-semibold"
                        : "text-[var(--color-muted)]"
                }`}
              >
                {label}
              </span>
            </div>
          );

          return (
            <li key={id} className={`rounded-xl border px-3 py-2.5 ${surface}`}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick?.(id)}
                  className="w-full text-left transition hover:bg-white/30 rounded-lg -m-1 p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-teal)]/50"
                >
                  {Inner}
                </button>
              ) : (
                Inner
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
