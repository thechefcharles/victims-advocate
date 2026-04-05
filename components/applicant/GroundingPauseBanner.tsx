"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/i18nProvider";

const IDLE_MS = 90_000;

type Props = {
  /** When false, timers are cleared and the banner hides. */
  enabled: boolean;
};

/**
 * Non-blocking grounding offer — time/navigation signals only (no content or sentiment analysis).
 * Phase 3: offer support, never gate progress.
 */
export function GroundingPauseBanner({ enabled }: Props) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }

    const resetIdle = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setVisible(true), IDLE_MS);
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      "keydown",
      "pointerdown",
      "scroll",
      "touchstart",
    ];
    activityEvents.forEach((ev) =>
      window.addEventListener(ev, resetIdle, { passive: true } as AddEventListenerOptions),
    );
    resetIdle();

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetIdle));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    };
  }, [enabled]);

  if (!visible) return null;

  return (
    <div
      className="fixed left-3 right-3 z-[38] max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-navy)] shadow-[var(--shadow-card)] sm:left-auto sm:right-4"
      style={{ bottom: "max(5.75rem, calc(4.75rem + env(safe-area-inset-bottom, 0px)))" }}
      role="status"
    >
      <p className="text-xs leading-relaxed">{t("intake.pathwaySafety.groundingBody")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-[var(--color-teal-deep)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-teal)] transition"
          onClick={() => setVisible(false)}
        >
          {t("intake.pathwaySafety.groundingContinue")}
        </button>
        <a
          href="tel:988"
          className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-bg)] transition"
        >
          {t("intake.pathwaySafety.groundingNeedSupport")}
        </a>
      </div>
    </div>
  );
}
