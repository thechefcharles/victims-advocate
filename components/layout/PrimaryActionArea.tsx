"use client";

import type { ReactNode } from "react";

export type PrimaryActionAreaProps = {
  /** Screen-reader / aria label */
  ariaLabel?: string;
  /** Optional slot above eyebrow (e.g. funnel stepper) */
  topSlot?: ReactNode;
  /** Set to `false` to hide the eyebrow row entirely (default: “Next step”) */
  eyebrow?: ReactNode | false;
  title?: ReactNode;
  description?: ReactNode;
  /** Main CTA(s) — keep to one visually dominant control */
  primary: ReactNode;
  /** Optional secondary row (outline buttons, etc.) */
  secondary?: ReactNode;
  className?: string;
  /** Card chrome: `brand` = emerald frame (default); `neutral` = slate, no green border */
  surface?: "brand" | "neutral";
};

/**
 * One dominant “what’s next” region for major dashboards (Phase 9).
 */
export function PrimaryActionArea({
  ariaLabel = "Next step",
  topSlot,
  eyebrow: eyebrowProp,
  title,
  description,
  primary,
  secondary,
  className = "",
  surface = "brand",
}: PrimaryActionAreaProps) {
  const showEyebrow = eyebrowProp !== false;
  const eyebrowContent = eyebrowProp === false ? null : (eyebrowProp ?? "Next step");
  const frameClass =
    surface === "neutral"
      ? "rounded-2xl border border-slate-700/65 bg-slate-950/85 p-6 sm:p-7 space-y-4 shadow-sm shadow-black/25"
      : "rounded-2xl border border-emerald-400/45 bg-gradient-to-br from-emerald-950/45 to-slate-950/85 p-6 sm:p-7 space-y-4 shadow-sm shadow-emerald-950/20";
  return (
    <section aria-label={ariaLabel} className={className}>
      <div className={frameClass}>
        {topSlot != null ? <div className="pb-1">{topSlot}</div> : null}
        {showEyebrow && eyebrowContent != null ? (
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200/90 flex flex-wrap items-center gap-2">
          {eyebrowContent}
        </div>
        ) : null}
        {(title != null || description != null) && (
          <div className="space-y-1">
            {title != null && <div className="text-lg font-semibold text-slate-50">{title}</div>}
            {description != null && (
              <div className="text-sm text-slate-400 max-w-2xl leading-relaxed">{description}</div>
            )}
          </div>
        )}
        <div className="flex w-full flex-wrap items-center gap-2 pt-1">{primary}</div>
        {secondary != null ? (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-3 border-t border-slate-800/80">
            {secondary}
          </div>
        ) : null}
      </div>
    </section>
  );
}
