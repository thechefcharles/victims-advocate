"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const END_THRESHOLD_PX = 50;

type Props = {
  children: React.ReactNode;
  /** Called when user has scrolled to bottom (within threshold). */
  onReachedEnd: (reached: boolean) => void;
  className?: string;
  /** Accessible name for the scrollable document region. */
  regionAriaLabel?: string;
};

/**
 * Scroll-locked legal document panel. Fires onReachedEnd(true) when
 * scrollTop + clientHeight >= scrollHeight - END_THRESHOLD_PX.
 */
export function LegalDocumentScrollRegion({
  children,
  onReachedEnd,
  className,
  regionAriaLabel = "Terms and legal document. Scroll to read the full document.",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [hintVisible, setHintVisible] = useState(true);
  const onReachedEndRef = useRef(onReachedEnd);
  onReachedEndRef.current = onReachedEnd;

  const evaluate = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const reached = scrollTop + clientHeight >= scrollHeight - END_THRESHOLD_PX;
    onReachedEndRef.current(reached);
    setHintVisible(!reached);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    evaluate();
    el.addEventListener("scroll", evaluate, { passive: true });
    const ro = new ResizeObserver(() => evaluate());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", evaluate);
      ro.disconnect();
    };
  }, [evaluate]);

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        aria-label={regionAriaLabel}
        className={
          className ??
          "max-h-[min(420px,55vh)] overflow-y-auto rounded-xl border border-[var(--color-border-light)] bg-white/90 p-4 shadow-inner focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-teal-deep)]"
        }
      >
        {children}
      </div>
      <p
        className={`text-sm text-[var(--color-slate)] transition-opacity ${hintVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-live="polite"
      >
        Scroll to continue reading
      </p>
    </div>
  );
}
